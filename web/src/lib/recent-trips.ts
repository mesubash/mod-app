import type { Vehicle } from "./api";

const KEY = "mod.recentTrips";
const MAX = 5;

export type RecentTrip = {
  from: string; // a Place name, or "__device__"
  to: string;
  vehicle: Vehicle;
  at: number;
};

/**
 * Recent trips, most recent first. There is no account system here, so this
 * is per-device storage rather than a saved-trip feature tied to a person --
 * it does the same job (do not make a returning traveller reselect their
 * commute) without taking on phone verification and a user store, which
 * UI-PROMPT's onboarding sketch assumes but nothing in this repo builds.
 */
export function getRecentTrips(): RecentTrip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentTrip[]) : [];
  } catch {
    return [];
  }
}

export function addRecentTrip(trip: Omit<RecentTrip, "at">): void {
  if (typeof window === "undefined") return;
  try {
    const rest = getRecentTrips().filter(
      (t) => !(t.from === trip.from && t.to === trip.to && t.vehicle === trip.vehicle),
    );
    const next = [{ ...trip, at: Date.now() }, ...rest].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A private window or a full quota loses the convenience, not the trip.
  }
}
