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
 * and the usual trip below are per-device storage rather than anything tied
 * to a person. UI-PROMPT's onboarding sketch has phone verification; it is
 * left out because nothing here needs to know who a traveller is.
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

const USUAL = "mod.usualTrip";
const ONBOARDED = "mod.onboarded";

export type UsualTrip = Omit<RecentTrip, "at">;

/** The trip saved at onboarding, which the home screen opens on. */
export function getUsualTrip(): UsualTrip | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USUAL);
    return raw ? (JSON.parse(raw) as UsualTrip) : null;
  } catch {
    return null;
  }
}

/** Saving a trip and skipping both count: onboarding is offered once. */
export function finishOnboarding(trip: UsualTrip | null): void {
  try {
    if (trip) window.localStorage.setItem(USUAL, JSON.stringify(trip));
    window.localStorage.setItem(ONBOARDED, "1");
  } catch {
    // Without storage the app still works; it just asks again next visit.
  }
}

export function onboarded(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDED) === "1";
  } catch {
    return true;
  }
}
