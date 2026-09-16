import { createFileRoute, Link, type SearchSchemaInput } from "@tanstack/react-router";
import { CircleAlert, Crosshair, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MapScreen, type MapRoute } from "@/components/mod/route-map";
import { usePosition } from "@/hooks/use-position";
import { useProbes } from "@/hooks/use-probes";
import { fetchRoutes, kilometres, minutes, type RouteOption, type Vehicle } from "@/lib/api";
import { routeProgress } from "@/lib/route-progress";
import { addRecentTrip } from "@/lib/recent-trips";
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
  validateSearch: (search: Record<string, unknown> & SearchSchemaInput) => ({
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
  }),
  component: Trip,
});

function Trip() {
  const search = Route.useSearch();
  const [running, setRunning] = useState(false);
  const position = usePosition(running);
  const [vehicle, setVehicle] = useState<Vehicle>(search.vehicle);
  const [destination, setDestination] = useState(
    PLACES.find((p) => p.name === search.to) ?? DEFAULT_DESTINATION,
  );
  // Same reason as the home screen: a start point can be chosen, so the app
  // works from outside Kathmandu. Real position still drives progress once
  // the trip is running.
  const [from, setFrom] = useState(PLACES.find((p) => p.name === search.from) ?? PLACES[2]!);
  const [useDevice, setUseDevice] = useState(search.from === "__device__");
  const [route, setRoute] = useState<RouteOption | null>(null);
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);

  const origin = useDevice ? position.point : from.point;

  useEffect(() => {
    if (running) return;
    let cancelled = false;
    setRoute(null);
    setFailed(false);
    if (!origin) return;
    fetchRoutes(origin, destination.point, vehicle)
      .then((r) => {
        if (cancelled) return;
        const next = r.routes[search.option] ?? r.routes[0];
        if (next) setRoute(next);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [running, origin, destination, vehicle, search.option, retry]);

  const state = useMemo(
    () => (route && position.point ? routeProgress(route, position.point) : null),
    [route, position.point],
  );

  // Feeds /coverage. A ping while the traveller is off the route is still
  // real information about a real road, so it is recorded regardless of
  // offRouteBy; the matcher on the server, not the client, decides what a
  // position pair can say about an edge.
  const { record: recordProbe } = useProbes(running);
  useEffect(() => {
    if (running && position.point) recordProbe(position.point);
  }, [running, position.point, recordProbe]);

  const mapRoutes: MapRoute[] = useMemo(
    () => (route ? [{ geometry: route.geometry, tone: "assigned" }] : []),
    [route],
  );

  if (!running) {
    return (
      <MapScreen
        position={position}
        completed={running && state && state.offRouteBy <= 120 ? state.done : 0}
        routes={mapRoutes}
        label={`Your route to ${destination.name}`}
      >
        <div className="space-y-5">
          <h1 className="text-2xl font-semibold tracking-tight">Start a trip</h1>
          <p className="text-base text-muted">
            MOD follows your position while you travel, so it can tell you when the road ahead
            changes. It stops watching the moment you end the trip.
          </p>

          <div className="vehicle-options">
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
            <span className="text-sm text-muted">Starting from</span>
            <select
              aria-label="Starting from"
              value={useDevice ? "__device__" : from.name}
              onChange={(e) => {
                if (e.target.value === "__device__") {
                  setUseDevice(true);
                  position.ask();
                } else {
                  setUseDevice(false);
                  setFrom(PLACES.find((p) => p.name === e.target.value) ?? from);
                }
              }}
              className="mt-1 min-h-11 w-full rounded-[6px] border border-border bg-background px-3 text-base"
            >
              {PLACES.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
              <option value="__device__">Where I am now</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-muted">Going to</span>
            <select
              aria-label="Going to"
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

          {useDevice && !position.point && (
            <p role="status" className="text-sm text-muted">
              {position.error ?? "Choose your current location to find a route."}
              <button className="retry-button" onClick={position.ask}>
                Find my location
              </button>
            </p>
          )}
          {failed && (
            <div role="alert">
              No route available. Try another starting point or destination.
              <button className="retry-button" onClick={() => setRetry((n) => n + 1)}>
                Try again
              </button>
            </div>
          )}
          {!route && !failed && origin && <p role="status">Finding your route…</p>}
          {route && (
            <p className="text-muted">
              {minutes(route.seconds)} · {kilometres(route.metres)} · Free-flow estimate
            </p>
          )}
          <button
            type="button"
            disabled={!route}
            onClick={() => {
              // Recorded on start, not on selection: choosing a place in a
              // dropdown is not evidence anyone actually went there.
              addRecentTrip({
                from: useDevice ? "__device__" : from.name,
                to: destination.name,
                vehicle,
              });
              setRunning(true);
            }}
            className="disabled:opacity-40 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-foreground px-4 text-base font-medium text-inverse"
          >
            <Crosshair size={20} aria-hidden /> Start trip to {destination.name}
          </button>
        </div>
      </MapScreen>
    );
  }

  return (
    <MapScreen
      position={position}
      completed={running && state && state.offRouteBy <= 120 ? state.done : 0}
      routes={mapRoutes}
      label={`Your route to ${destination.name}`}
    >
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
    </MapScreen>
  );
}
