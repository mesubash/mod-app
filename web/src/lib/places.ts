import type { SearchSchemaInput } from "@tanstack/react-router";

import { distance, type Point } from "./api";

/**
 * Landmarks along the study corridor.
 *
 * There is no geocoder yet, so a traveller picks a destination from the
 * junctions the corridor is actually built around. Coordinates snap to the
 * nearest routable node server-side, so approximate is fine.
 */
export type Place = { name: string; point: Point };

export const PLACES = [
  { name: "Kalimati", point: { lon: 85.297, lat: 27.699 } },
  { name: "Shahid Gate", point: { lon: 85.313, lat: 27.696 } },
  { name: "Tripureshwor", point: { lon: 85.314, lat: 27.6929 } },
  { name: "Thapathali", point: { lon: 85.317, lat: 27.6895 } },
  { name: "Maitighar", point: { lon: 85.3188, lat: 27.6931 } },
  { name: "New Baneshwor", point: { lon: 85.3345, lat: 27.689 } },
  { name: "Tinkune", point: { lon: 85.348, lat: 27.687 } },
  { name: "Jadibuti", point: { lon: 85.3555, lat: 27.6805 } },
  { name: "Koteshwor", point: { lon: 85.3495, lat: 27.6785 } },
];

export const VEHICLES = [
  { id: "motorcycle", label: "Scooter" },
  { id: "car", label: "Car" },
  { id: "bus", label: "Bus" },
  { id: "truck", label: "Truck" },
] as const;

/** The far end of the corridor: a sensible default destination. */
export const DEFAULT_DESTINATION: Place = PLACES[PLACES.length - 1]!;

// A landmark further than this from every junction on a route is not one a
// traveller would recognise the route by.
const VIA_WITHIN_M = 350;

function gap(geometry: [number, number][], point: Point): number {
  return Math.min(...geometry.map(([lon, lat]) => distance({ lon, lat }, point)));
}

/**
 * A "Via Maitighar" label per route. The graph carries no street names, so
 * each route is named by the corridor landmark it passes closest to, other
 * than its own two ends, preferring one the other routes do not pass and never
 * repeating one, since two options both called "Via Thapathali" tell a
 * traveller nothing. Null
 * when a route passes none of them.
 */
export function viaNames(geometries: [number, number][][], ends: Point[]): (string | null)[] {
  const near = geometries.map((g) =>
    PLACES.filter((p) => !ends.some((e) => distance(e, p.point) < VIA_WITHIN_M))
      .map((p) => ({ name: p.name, d: gap(g, p.point) }))
      .filter((c) => c.d < VIA_WITHIN_M)
      .sort((a, b) => a.d - b.d),
  );
  const used = new Set<string>();
  return near.map((candidates, i) => {
    const unused = candidates.filter((c) => !used.has(c.name));
    const pick =
      unused.find(
        (c) => !near.some((other, j) => j !== i && other.some((o) => o.name === c.name)),
      ) ?? unused[0];
    if (pick) used.add(pick.name);
    return pick?.name ?? null;
  });
}

/** Search params shared by the trip and alternatives screens. */
export function tripSearch(search: Record<string, unknown> & SearchSchemaInput) {
  return {
    from:
      search["from"] === "__device__"
        ? "__device__"
        : (PLACES.find((p) => p.name === search["from"])?.name ?? PLACES[2]!.name),
    to: PLACES.find((p) => p.name === search["to"])?.name ?? DEFAULT_DESTINATION.name,
    vehicle: VEHICLES.find((v) => v.id === search["vehicle"])?.id ?? "motorcycle",
    option:
      Number.isInteger(Number(search["option"])) && Number(search["option"]) >= 0
        ? Number(search["option"])
        : 0,
  };
}

/** The corridor landmark closest to a point. */
export function nearest(point: Point): { name: string; metres: number } {
  return PLACES.map((p) => ({ name: p.name, metres: distance(point, p.point) })).sort(
    (a, b) => a.metres - b.metres,
  )[0]!;
}

/** "350 m from Thapathali", for naming a single link an operator might close. */
export function nearPlace(point: Point): string {
  const { name, metres } = nearest(point);
  return metres < 100 ? `at ${name}` : `${Math.round(metres / 50) * 50} m from ${name}`;
}
