import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleAlert, Crosshair, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { RouteMap, type MapRoute } from "@/components/mod/route-map";
import { Screen } from "@/components/mod/ui";
import { usePosition } from "@/hooks/use-position";
import {
  distance,
  fetchRoutes,
  kilometres,
  minutes,
  type Point,
  type RouteOption,
  type Vehicle,
} from "@/lib/api";
import { DEFAULT_DESTINATION, PLACES, VEHICLES } from "@/lib/places";

export const Route = createFileRoute("/trip")({
  head: () => ({
    meta: [
      { title: "Trip in progress — MOD" },
      {
        name: "description",
        content: "Where you are on the advised route, and an honest arrival estimate.",
      },
    ],
  }),
  component: Trip,
});

/** How far along the route the traveller is, by nearest point on the line. */
function progress(route: RouteOption, here: Point) {
  let nearest = 0;
  let best = Infinity;
  for (const [i, pair] of route.geometry.entries()) {
    const d = distance(here, { lon: pair[0], lat: pair[1] });
    if (d < best) {
      best = d;
      nearest = i;
    }
  }
  return {
    done: nearest / Math.max(route.geometry.length - 1, 1),
    offRouteBy: best,
  };
}

function Trip() {
  const [running, setRunning] = useState(false);
  const position = usePosition(running);
  const [vehicle, setVehicle] = useState<Vehicle>("motorcycle");
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [route, setRoute] = useState<RouteOption | null>(null);
  const [failed, setFailed] = useState(false);

  const here = position.point;

  // Route once, when the trip starts. Re-routing on every position update is
  // what makes an app flip-flop; re-advice belongs behind a threshold, and
  // that is Phase 5 rather than this.
  useEffect(() => {
    if (!running || !here || route) return;
    fetchRoutes(here, destination.point, vehicle)
      .then((r) => (r.routes[0] ? setRoute(r.routes[0]) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [running, here, route, destination, vehicle]);

  const state = useMemo(() => (route && here ? progress(route, here) : null), [route, here]);

  const mapRoutes: MapRoute[] = route ? [{ geometry: route.geometry, tone: "assigned" }] : [];

  if (!running) {
    return (
      <Screen>
        <div className="space-y-5">
          <h1 className="text-2xl font-semibold tracking-tight">Start a trip</h1>
          <p className="text-base text-muted">
            MOD follows your position while you travel, so it can tell you when the road ahead
            changes. It stops watching the moment you end the trip.
          </p>

          <div className="flex flex-wrap gap-2">
            {VEHICLES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setVehicle(id)}
                aria-pressed={vehicle === id}
                className={`inline-flex min-h-11 items-center rounded-[6px] px-3 text-base ${
                  vehicle === id
                    ? "bg-foreground text-inverse"
                    : "bg-surface text-foreground hover:bg-surface-hover"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="text-sm text-muted">Going to</span>
            <select
              value={destination.name}
              onChange={(e) =>
                setDestination(PLACES.find((p) => p.name === e.target.value) ?? DEFAULT_DESTINATION)
              }
              className="mt-1 min-h-11 w-full rounded-[6px] border border-border bg-background px-3 text-base"
            >
              {PLACES.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setRunning(true)}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-foreground px-4 text-base font-medium text-inverse"
          >
            <Crosshair size={20} aria-hidden /> Start trip to {destination.name}
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="space-y-4">
        <header className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">To {destination.name}</h1>
          {route && <span className="text-lg font-semibold">{minutes(route.seconds)}</span>}
        </header>

        {position.status === "denied" && (
          <section className="rounded-[6px] bg-surface p-4">
            <h2 className="text-lg font-medium">Location is blocked</h2>
            <p className="mt-1 text-base text-muted">
              MOD cannot follow the trip without it. Allow location in your browser settings.
            </p>
          </section>
        )}

        {failed && (
          <section className="rounded-[6px] bg-surface p-4">
            <h2 className="text-lg font-medium">No route from here</h2>
            <p className="mt-1 text-base text-muted">You may be outside the corridor MOD covers.</p>
          </section>
        )}

        {!route && !failed && <div className="h-[260px] w-full rounded-[6px] bg-surface" />}

        {route && <RouteMap routes={mapRoutes} height={260} label="Your route" />}

        {state && route && (
          <section className="rounded-[6px] bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-medium">{Math.round(state.done * 100)}% of the way</h2>
              <span className="text-base text-muted">{kilometres(route.metres)} total</span>
            </div>
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-valuenow={Math.round(state.done * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-foreground"
                style={{ width: `${Math.max(state.done * 100, 2)}%` }}
              />
            </div>
            {state.offRouteBy > 120 && (
              <p className="mt-3 text-base text-alert">
                You are about {state.offRouteBy} m off the advised route.
              </p>
            )}
          </section>
        )}

        <p className="text-sm text-muted">
          Estimates are free-flow. MOD has no live traffic feed for this corridor yet, so it will
          not claim to know what is moving right now.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/report"
            className="inline-flex min-h-11 items-center gap-2 rounded-[6px] bg-surface px-4 text-base"
          >
            <CircleAlert size={18} aria-hidden /> Report a problem
          </Link>
          <Link
            to="/after-trip"
            onClick={() => setRunning(false)}
            className="inline-flex min-h-11 items-center gap-2 rounded-[6px] bg-foreground px-4 text-base font-medium text-inverse"
          >
            <Square size={16} aria-hidden /> End trip
          </Link>
        </div>
      </div>
    </Screen>
  );
}
