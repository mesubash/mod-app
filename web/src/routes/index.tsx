import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownUp,
  ArrowRight,
  Bike,
  Bus,
  Car,
  Crosshair,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MapScreen, type MapRoute } from "@/components/mod/route-map";
import { PlaceInput } from "@/components/mod/place-input";
import { usePosition } from "@/hooks/use-position";
import {
  fetchRoutes,
  getClosures,
  kilometres,
  minutes,
  until,
  type Closure,
  type Point,
  type RouteResponse,
  type Vehicle,
} from "@/lib/api";
import { DEFAULT_DESTINATION, PLACES, VEHICLES } from "@/lib/places";
import { getRecentTrips, type RecentTrip } from "@/lib/recent-trips";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOD — your route this morning" },
      {
        name: "description",
        content: "Which alternative route is yours when the road ahead is disrupted.",
      },
    ],
  }),
  component: Home,
});

const ICON = { motorcycle: Bike, car: Car, bus: Bus, truck: Truck };

function Home() {
  const navigate = useNavigate();
  const position = usePosition(false);
  const [vehicle, setVehicle] = useState<Vehicle>("motorcycle");
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  // Most of the corridor's testers are not standing on it. Picking a start
  // point keeps the app usable from anywhere; real position is the option,
  // not the requirement.
  const [from, setFrom] = useState(PLACES[2]!);
  const [useDevice, setUseDevice] = useState(false);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [selected, setSelected] = useState(0);
  const [retry, setRetry] = useState(0);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [recent, setRecent] = useState<RecentTrip[]>([]);

  // What is shut is the reason this product exists, so it loads whether or not
  // the traveller has shared a position yet.
  useEffect(() => {
    getClosures()
      .then(setClosures)
      .catch(() => setClosures([]));
  }, []);

  // Read after mount, not from a useState initializer. This route is
  // server-rendered, the server has no localStorage, and reading it during
  // the render that gets sent to the client produces a real tree on the
  // client that does not match what the server sent -- React discards it and
  // re-renders the whole page client-side. Starting from [] on both sides
  // and filling it in afterwards keeps the two renders identical.
  useEffect(() => {
    setRecent(getRecentTrips());
  }, []);

  function applyRecent(trip: RecentTrip) {
    if (trip.from === "__device__") {
      setUseDevice(true);
      position.ask();
    } else {
      setUseDevice(false);
      setFrom(PLACES.find((p) => p.name === trip.from) ?? from);
    }
    setDestination(PLACES.find((p) => p.name === trip.to) ?? destination);
    setVehicle(trip.vehicle);
  }

  const origin: Point | null = useDevice ? position.point : from.point;

  useEffect(() => {
    setResult(null);
    setSelected(0);
    if (!origin) {
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    fetchRoutes(origin, destination.point, vehicle)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setState("idle");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [origin, destination, vehicle, retry]);

  const best = result?.routes[selected];
  const mapRoutes: MapRoute[] = useMemo(
    () =>
      result?.routes.map((r, i) => ({
        geometry: r.geometry,
        tone: i === selected ? ("assigned" as const) : ("other" as const),
      })) ?? [],
    [result, selected],
  );

  return (
    <MapScreen position={position} routes={mapRoutes} label={`Routes to ${destination.name}`}>
      <div className="space-y-4">
        <header className="planner-heading">
          <h1>Where are you going?</h1>
        </header>

        {closures.length > 0 && (
          <section className="space-y-2">
            {closures.map((c) => (
              <div key={c.id} className="rounded-[6px] bg-surface p-4">
                <h2 className="flex items-start gap-2 text-base font-medium text-alert">
                  <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden />
                  {c.reason}
                </h2>
                <p className="mt-1 text-base text-muted">
                  {c.kind} · clears in {until(c.ends)}. Routes account for active closures.
                </p>
              </div>
            ))}
          </section>
        )}

        {recent.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm text-muted">Recent</h2>
            {recent.map((trip, i) => {
              const Icon = ICON[trip.vehicle];
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => applyRecent(trip)}
                  className="alternative-route"
                >
                  <span>
                    {trip.from === "__device__" ? "Current location" : trip.from}
                    <small>to {trip.to}</small>
                  </span>
                  <strong className="flex items-center gap-1.5 font-normal text-muted">
                    <Icon size={16} aria-hidden />
                  </strong>
                </button>
              );
            })}
          </section>
        )}

        <section className="route-fields">
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

          {useDevice && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Crosshair size={16} aria-hidden />
              {position.status === "denied"
                ? "Location is blocked. Allow it in your browser settings, or pick a starting point above."
                : position.status === "unavailable"
                  ? "Location unavailable. Pick a starting point above."
                  : position.point
                    ? `Found you, to within ${Math.round(position.accuracy ?? 0)} m.`
                    : "Finding you…"}
            </p>
          )}

          <PlaceInput label="Going to" value={destination} onChange={setDestination} />
          <button
            type="button"
            className="swap-places"
            aria-label="Swap starting point and destination"
            disabled={useDevice}
            onClick={() => {
              setFrom(destination);
              setDestination(from);
            }}
          >
            <ArrowDownUp size={18} />
          </button>
        </section>
        <div className="vehicle-options">
          {VEHICLES.map(({ id, label }) => {
            const Icon = ICON[id];
            const on = vehicle === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setVehicle(id)}
                aria-pressed={on}
                className={`inline-flex min-h-11 items-center gap-2 rounded-[6px] px-3 text-base ${
                  on
                    ? "bg-foreground text-inverse"
                    : "bg-surface text-foreground hover:bg-surface-hover"
                }`}
              >
                <Icon size={18} aria-hidden />
                {label}
              </button>
            );
          })}
        </div>

        {best && (
          <button
            className="mobile-route-button"
            onClick={(e) =>
              e.currentTarget
                .closest(".map-panel")
                ?.querySelector(".route-summary")
                ?.scrollIntoView({ block: "start" })
            }
          >
            View routes · {minutes(best.seconds)} <ArrowRight size={16} aria-hidden />
          </button>
        )}

        {state === "error" && (
          <section className="rounded-[6px] bg-surface p-4">
            <h2 className="text-lg font-medium">The route service did not answer</h2>
            <p className="mt-1 text-base text-muted">Check your connection and try again.</p>
            <button className="retry-button" onClick={() => setRetry((n) => n + 1)}>
              Try again
            </button>
          </section>
        )}

        {origin && state === "loading" && !result && (
          <p className="text-sm text-muted" role="status">
            Finding routes…
          </p>
        )}

        {best && (
          <>
            <section className="route-summary">
              <button
                className="mobile-edit-button"
                onClick={(e) => e.currentTarget.closest(".map-panel")?.scrollTo({ top: 0 })}
              >
                Edit journey
              </button>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-medium">To {destination.name}</h2>
                <span className="text-lg font-semibold">{minutes(best.seconds)}</span>
              </div>
              <p className="mt-1 text-base text-muted">
                {kilometres(best.metres)} · Free-flow estimate
              </p>
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/trip",
                    search: {
                      from: useDevice ? "__device__" : from.name,
                      to: destination.name,
                      vehicle,
                      option: selected,
                    },
                  })
                }
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[6px] bg-foreground px-4 text-base font-medium text-inverse"
              >
                Start trip <ArrowRight size={18} className="ml-2" aria-hidden />
              </button>
            </section>

            {result.routes.length > 1 && (
              <section className="space-y-2">
                <h2 className="text-base font-medium">Route options</h2>
                {result.routes.map((r, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setSelected(i)}
                    aria-pressed={selected === i}
                    className="alternative-route"
                  >
                    <span>
                      {i === 0 ? "Suggested route" : `Alternative ${i}`}
                      <small>{kilometres(r.metres)}</small>
                    </span>
                    <strong>{minutes(r.seconds)}</strong>
                  </button>
                ))}
              </section>
            )}
          </>
        )}

        {result && result.routes.length === 0 && (
          <section className="rounded-[6px] bg-surface p-4">
            <h2 className="text-lg font-medium">No route from here</h2>
            <p className="mt-1 text-base text-muted">
              You are outside the corridor MOD covers, which runs Tripureshwor to Koteshwor.
            </p>
          </section>
        )}
        <p className="planner-footnote">Estimates are not live traffic.</p>
      </div>
    </MapScreen>
  );
}
