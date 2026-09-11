import { useCallback, useEffect, useRef, useState } from "react";

import type { Point } from "@/lib/api";

export type PositionState = {
  point: Point | null;
  accuracy: number | null;
  /** "asking" only while the browser prompt is open. */
  status: "idle" | "asking" | "watching" | "denied" | "unavailable";
  error: string | null;
};

/**
 * The traveller's live position.
 *
 * Only watches while a trip is running. Holding a GPS watch open on a phone
 * for a screen nobody is looking at is how an app earns a reputation for
 * eating battery, and that reputation is not recoverable.
 */
export function usePosition(active: boolean): PositionState & { ask: () => void } {
  const [state, setState] = useState<PositionState>({
    point: null,
    accuracy: null,
    status: "idle",
    error: null,
  });
  const watch = useRef<number | null>(null);

  const ask = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, status: "unavailable", error: "This device has no location." }));
      return;
    }
    setState((s) => ({ ...s, status: "asking" }));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setState({
          point: { lon: coords.longitude, lat: coords.latitude },
          accuracy: coords.accuracy,
          status: "watching",
          error: null,
        }),
      (e) =>
        setState((s) => ({
          ...s,
          status: e.code === e.PERMISSION_DENIED ? "denied" : "unavailable",
          error: e.message,
        })),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  useEffect(() => {
    if (!active || !("geolocation" in navigator)) return;
    watch.current = navigator.geolocation.watchPosition(
      ({ coords }) =>
        setState({
          point: { lon: coords.longitude, lat: coords.latitude },
          accuracy: coords.accuracy,
          status: "watching",
          error: null,
        }),
      (e) =>
        setState((s) => ({
          ...s,
          status: e.code === e.PERMISSION_DENIED ? "denied" : "unavailable",
          error: e.message,
        })),
      { enableHighAccuracy: true, maximumAge: 5_000 },
    );
    return () => {
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
    };
  }, [active]);

  return { ...state, ask };
}
