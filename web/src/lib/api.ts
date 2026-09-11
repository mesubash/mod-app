export type Vehicle = "motorcycle" | "car" | "bus" | "truck";

export type Point = { lon: number; lat: number };

export type RouteOption = {
  edges: string[];
  seconds: number;
  metres: number;
  geometry: [number, number][];
};

export type RouteResponse = {
  routes: RouteOption[];
  origin_node: string;
  destination_node: string;
};

const BASE = import.meta.env["VITE_API_URL"] ?? "http://localhost:8000";

export async function fetchRoutes(
  origin: Point,
  destination: Point,
  vehicle: Vehicle,
  closed: string[] = [],
): Promise<RouteResponse> {
  const response = await fetch(`${BASE}/route`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ origin, destination, vehicle, closed }),
  });
  if (!response.ok) throw new Error(`route service returned ${response.status}`);
  return response.json();
}

export function minutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m < 1 ? "under a minute" : `${m} min`;
}

export function kilometres(metres: number): string {
  return `${(metres / 1000).toFixed(1)} km`;
}

/** Metres between two coordinates. Good enough over a 7 km corridor. */
export function distance(a: Point, b: Point): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const x = dLon * Math.cos(lat);
  return Math.round(Math.sqrt(dLat * dLat + x * x) * R);
}

export type Closure = {
  id: number;
  edges: string[];
  reason: string;
  kind: string;
  starts: number;
  ends: number;
};

export type Report = {
  id: number;
  kind: "jam" | "flood" | "closed" | "accident";
  lon: number;
  lat: number;
  created: number;
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

export const getClosures = () => json<Closure[]>("/closures");

export const getReports = () => json<Report[]>("/reports");

export const postReport = (kind: Report["kind"], at: Point) =>
  json<Report>("/reports", { method: "POST", body: JSON.stringify({ kind, at }) });

export const postTripAnswer = (took_suggested: string, already_knew: string) =>
  json<{ id: number }>("/trip-answers", {
    method: "POST",
    body: JSON.stringify({ took_suggested, already_knew }),
  });

export const postClosure = (
  token: string,
  body: { edges: string[]; reason: string; kind: string; minutes: number },
) =>
  json<Closure>("/closures", {
    method: "POST",
    headers: { "content-type": "application/json", "x-operator-token": token },
    body: JSON.stringify(body),
  });

export const clearClosure = (token: string, id: number) =>
  json<{ cleared: boolean }>(`/closures/${id}`, {
    method: "DELETE",
    headers: { "x-operator-token": token },
  });

/** Minutes until a timestamp, for "until about 10:30" style copy. */
export function until(epochSeconds: number): string {
  const mins = Math.round((epochSeconds * 1000 - Date.now()) / 60000);
  if (mins <= 0) return "now";
  if (mins < 60) return `about ${mins} min`;
  return `about ${Math.round(mins / 60)} h`;
}
