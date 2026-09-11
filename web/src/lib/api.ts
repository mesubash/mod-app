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
