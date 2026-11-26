import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CircleAlert,
  CornerUpLeft,
  CornerUpRight,
  Crosshair,
  RotateCcw,
  Square,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { MapScreen, type MapRoute } from "@/components/mod/route-map";
import { PlaceInput } from "@/components/mod/place-input";
import { ReAdvicePrompt } from "@/components/mod/re-advice-prompt";
import { usePosition } from "@/hooks/use-position";
import { useProbes } from "@/hooks/use-probes";
import {
  fetchRoutes,
  getClosures,
  kilometres,
  minutes,
  type RouteOption,
  type Vehicle,
} from "@/lib/api";
import { nextManeuver, type Turn } from "@/lib/directions";
import { routeProgress } from "@/lib/route-progress";
import { shouldSuggestAlternative } from "@/lib/re-advice-trigger";
import { addRecentTrip } from "@/lib/recent-trips";
import { DEFAULT_DESTINATION, PLACES, VEHICLES, tripSearch } from "@/lib/places";

const ALT_CHECK_INTERVAL_MS = 30_000;
// Matches the copy: "we will not ask again for a few minutes."
const ALT_DISMISS_COOLDOWN_MS = 5 * 60_000;

const TURN_ICON = {
  left: CornerUpLeft,
  right: CornerUpRight,
  "sharp-left": CornerUpLeft,
  "sharp-right": CornerUpRight,
  "u-turn": RotateCcw,
} satisfies Record<Turn, typeof CornerUpLeft>;

const TURN_LABEL: Record<Turn, string> = {
  left: "Turn left",
  right: "Turn right",
  "sharp-left": "Sharp left",
  "sharp-right": "Sharp right",
  "u-turn": "U-turn",
};

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
  validateSearch: tripSearch,
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
  // Carried to the after-trip questions so the answer counts against the
  // diverted route it is about.
  const [spreadKey, setSpreadKey] = useState<string | null>(null);
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
        setSpreadKey(r.spread_key);
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

  // Geometry-only: the corridor graph carries no street names (see
  // DATA.md), so this can say "turn right in 150 m" and never "onto Ring
  // Road." Only trustworthy near the route -- routeProgress's own
  // offRouteBy threshold gates whether it is shown.
  const maneuver = useMemo(
    () =>
      route && position.point && state && state.offRouteBy <= 120
        ? nextManeuver(route, position.point)
        : null,
    [route, position.point, state],
  );

  // Feeds /coverage. A ping while the traveller is off the route is still
  // real information about a real road, so it is recorded regardless of
  // offRouteBy; the matcher on the server, not the client, decides what a
  // position pair can say about an edge.
  const { record: recordProbe } = useProbes(running);
  useEffect(() => {
    if (running && position.point) recordProbe(position.point);
  }, [running, position.point, recordProbe]);

  // Polled on a ref, not a `position.point` dependency: GPS updates every
  // few seconds while position.point is itself in the deps array would clear
  // and restart this interval before it ever reached 30s, so the check would
  // never actually fire.
  const livePosition = useRef(position.point);
  useEffect(() => {
    livePosition.current = position.point;
  }, [position.point]);

  const [alt, setAlt] = useState<{
    route: RouteOption;
    savedSeconds: number;
    blocked: boolean;
  } | null>(null);
  const dismissedUntil = useRef(0);

  useEffect(() => {
    if (!running || !route || alt) return;
    const timer = setInterval(() => {
      const here = livePosition.current;
      if (!here || Date.now() < dismissedUntil.current) return;
      Promise.all([fetchRoutes(here, destination.point, vehicle), getClosures()])
        .then(([r, closures]) => {
          const candidate = r.routes[0];
          if (!candidate) return;
          const verdict = shouldSuggestAlternative({
            currentRoute: route,
            doneFraction: routeProgress(route, here).done,
            candidateSeconds: candidate.seconds,
            shutEdges: new Set(closures.flatMap((c) => c.edges)),
          });
          if (verdict) setAlt({ route: candidate, ...verdict });
        })
        .catch(() => {});
    }, ALT_CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [running, route, destination, vehicle, alt]);

  function acceptAlt() {
    if (!alt) return;
    setRoute(alt.route);
    setAlt(null);
  }

  function dismissAlt() {
    dismissedUntil.current = Date.now() + ALT_DISMISS_COOLDOWN_MS;
    setAlt(null);
  }

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

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <PlaceInput
                label="Starting from"
                value={useDevice ? { name: "Where I am now", point: from.point } : from}
                onChange={(p) => {
                  setUseDevice(false);
                  setFrom(p);
                }}
              />
            </div>
            <button
              type="button"
              aria-label="Use my current location"
              aria-pressed={useDevice}
              onClick={() => {
                setUseDevice(true);
                position.ask();
              }}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-[6px] border border-border ${
                useDevice ? "bg-foreground text-inverse" : "bg-background hover:bg-surface-hover"
              }`}
            >
              <Crosshair size={18} aria-hidden />
            </button>
          </div>

          <PlaceInput label="Going to" value={destination} onChange={setDestination} />

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

        {maneuver &&
          (() => {
            const Icon = TURN_ICON[maneuver.turn];
            return (
              <section className="flex items-center gap-3 rounded-[6px] bg-foreground p-4 text-inverse">
                <Icon size={28} aria-hidden />
                <p className="text-lg font-semibold">
                  {TURN_LABEL[maneuver.turn]} in {maneuver.distanceMetres} m
                </p>
              </section>
            );
          })()}

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

        {alt && (
          <ReAdvicePrompt
            what={
              alt.blocked
                ? "A road on your route is closed ahead."
                : "A condition changed on the road ahead."
            }
            advice={
              alt.savedSeconds > 0
                ? `A different route from here saves about ${minutes(alt.savedSeconds)}.`
                : "A different route from here avoids it."
            }
            {...(alt.blocked
              ? { note: "Staying means continuing toward a road that is currently shut." }
              : {})}
            onSwitch={acceptAlt}
            onStay={dismissAlt}
          />
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
            search={spreadKey ? { key: spreadKey, option: search.option } : {}}
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
