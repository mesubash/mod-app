import type { Point } from "./api";

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
