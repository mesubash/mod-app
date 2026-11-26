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
  /** Set when an active closure sits on this trip's usual quickest path. */
  usual_seconds: number | null;
  /** Index into routes of the alternative this traveller is advised to take. */
  assigned: number;
  spread_key: string | null;
  recent_assignments: number[] | null;
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

/** "about 6 minutes longer than usual" style cost of one route against another. */
export function difference(seconds: number, against: number, than: string): string {
  const m = Math.round((seconds - against) / 60);
  if (m === 0) return `about the same time as ${than}`;
  const n = Math.abs(m);
  return `about ${n} minute${n === 1 ? "" : "s"} ${m > 0 ? "longer" : "shorter"} than ${than}`;
}

export function kilometres(metres: number): string {
  return `${(metres / 1000).toFixed(1)}\u00a0km`;
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

export type Ping = { lon: number; lat: number; at: number };

export type Coverage = {
  window_minutes: number;
  observations: number;
  edges_with_data: number;
  edges_total: number;
  share_of_network: number;
  usable: boolean;
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

// One request per batch of pings, not one per ping: a request every few
// seconds is what earns a routing app a reputation for eating battery and
// mobile data, and that reputation does not come back.
export const postProbes = (pings: Ping[]) =>
  json<{ matched: number; sent: number }>("/probes", {
    method: "POST",
    body: JSON.stringify({ pings }),
  });

export const getCoverage = () => json<Coverage>("/coverage");

export type SpreadSplit = {
  key: string;
  /** Travellers who accepted each alternative. */
  counts: number[];
  /** Of those, how many answered the after-trip question, and said yes. */
  answered: number[];
  took: number[];
  origin: Point;
  destination: Point;
  vehicle: Vehicle;
};
export type SpreadResponse = { window_minutes: number; splits: SpreadSplit[] };

export type Flow = { edge: string; window_minutes: number; measured_kmh: number | null };

export const getFlow = (edge: string) => json<Flow>(`/flow?edge=${encodeURIComponent(edge)}`);

// Operator only: a split with a count of one describes one traveller's trip.
export const getSpread = (token: string) =>
  json<SpreadResponse>("/spread", {
    headers: { "content-type": "application/json", "x-operator-token": token },
  });

export type PlaceResult = { name: string; lon: number; lat: number };
export type PlaceSearchResponse = { results: PlaceResult[]; configured: boolean };

export const searchPlaces = (q: string) =>
  json<PlaceSearchResponse>(`/places/search?q=${encodeURIComponent(q)}`);

// Sent when a diverted traveller accepts a route, not when routes are
// fetched, so the operator's split counts travellers rather than page loads.
export const postAssignment = (spread_key: string, index: number) =>
  json<{ recorded: boolean }>("/assignments", {
    method: "POST",
    body: JSON.stringify({ spread_key, index }),
  });

// Operator only: a report is an exact position and a time.
export const getReports = (token: string) =>
  json<Report[]>("/reports", {
    headers: { "content-type": "application/json", "x-operator-token": token },
  });

export const postReport = (kind: Report["kind"], at: Point) =>
  json<Report>("/reports", { method: "POST", body: JSON.stringify({ kind, at }) });

export const postTripAnswer = (
  took_suggested: string,
  already_knew: string,
  spread_key?: string,
  index?: number,
) =>
  json<{ id: number }>("/trip-answers", {
    method: "POST",
    body: JSON.stringify({ took_suggested, already_knew, spread_key, index }),
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

/** "10:30" for an epoch-seconds timestamp, in the traveller's own clock. */
export function clock(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Minutes until a timestamp, for "until about 10:30" style copy. */
export function until(epochSeconds: number): string {
  const mins = Math.round((epochSeconds * 1000 - Date.now()) / 60000);
  if (mins <= 0) return "now";
  if (mins < 60) return `about ${mins} min`;
  return `about ${Math.round(mins / 60)} h`;
}
