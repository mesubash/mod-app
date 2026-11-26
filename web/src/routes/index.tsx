import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownUp,
  ArrowRight,
  Ban,
  Bike,
  Bus,
  CalendarClock,
  Car,
  CloudRain,
  Crosshair,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MapScreen, type MapRoute } from "@/components/mod/route-map";
import { PlaceInput } from "@/components/mod/place-input";
import { usePosition } from "@/hooks/use-position";
import {
  difference,
  fetchRoutes,
  getClosures,
  postAssignment,
  kilometres,
  minutes,
  clock,
  type Closure,
  type Point,
  type RouteResponse,
  type Vehicle,
} from "@/lib/api";
import { DEFAULT_DESTINATION, PLACES, VEHICLES, viaNames } from "@/lib/places";
import {
  getRecentTrips,
  getUsualTrip,
  onboarded,
  type RecentTrip,
  type UsualTrip,
} from "@/lib/recent-trips";

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

// Status carries an icon and a word, never colour alone.
const CLOSURE_KIND = {
  closure: { icon: Ban, word: "Road closed" },
  accident: { icon: TriangleAlert, word: "Accident" },
  weather: { icon: CloudRain, word: "Weather" },
  event: { icon: CalendarClock, word: "Event" },
};

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
    if (!onboarded()) {
      navigate({ to: "/onboarding" });
      return;
    }
    setRecent(getRecentTrips());
    const usual = getUsualTrip();
    if (usual) applyRecent(usual);
    // Once, on arrival: the saved trip is where the screen starts, not a
    // value it keeps snapping back to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyRecent(trip: UsualTrip) {
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
        setSelected(r.assigned);
        setState("idle");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [origin, destination, vehicle, retry]);

  const best = result?.routes[selected];
  const names = useMemo(
    () =>
      result && origin
        ? viaNames(
            result.routes.map((r) => r.geometry),
            [origin, destination.point],
          )
        : [],
    // origin is derived each render; result only changes after a fetch for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result],
  );
  const trip = {
    from: useDevice ? "__device__" : from.name,
    to: destination.name,
    vehicle,
    option: selected,
  };

  function start() {
    // Counted on acceptance so the operator's split is travellers, not
    // page loads. A failed count must not stop anyone setting off.
    if (result?.spread_key) postAssignment(result.spread_key, selected).catch(() => {});
    navigate({ to: "/trip", search: trip });
  }
  const mapRoutes: MapRoute[] = useMemo(
    () =>
      result?.routes.map((r, i) => ({
        geometry: r.geometry,
        tone: i === selected ? ("assigned" as const) : ("other" as const),
      })) ?? [],
    [result, selected],
  );

  const disrupted = result?.usual_seconds != null;
  // A disrupted trip leads with its assigned route: that screen is the
  // product, and a traveller stopped at a closure should not scroll for it.
  const routeBlock = best && result && (
    <>
      <section
        className={disrupted ? "rounded-[6px] bg-surface p-4" : "route-summary"}
        data-disrupted={disrupted || undefined}
      >
        {disrupted && (
          <div className="mb-3 space-y-2">
            {closures.map((c) => (
              <ClosureLine key={c.id} closure={c} />
            ))}
          </div>
        )}
        {result.usual_seconds == null && (
          <button
            className="mobile-edit-button"
            onClick={(e) => e.currentTarget.closest(".map-panel")?.scrollTo({ top: 0 })}
          >
            Edit journey
          </button>
        )}
        {result.usual_seconds != null ? (
          <>
            <h2 className="text-lg font-medium">
              Your route: {names[selected] ? `via ${names[selected]}` : `option ${selected + 1}`}
            </h2>
            <p className="mt-1 text-base">
              {minutes(best.seconds)}, {difference(best.seconds, result.usual_seconds, "usual")}.
              <span className="text-muted"> {kilometres(best.metres)}, free-flow estimate.</span>
            </p>
            <p className="mt-2 text-base text-muted">
              {result.routes.length > 1
                ? `Travellers on this trip are split across ${result.routes.length} routes, so no single road takes the whole diversion.`
                : "This is the only way through while the road is shut."}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-medium">To {destination.name}</h2>
              <span className="text-lg font-semibold">{minutes(best.seconds)}</span>
            </div>
            <p className="mt-1 text-base text-muted">
              {closures.length > 0
                ? "None of the active closures is on your route."
                : "No disruptions on your route."}
            </p>
          </>
        )}
        {!disrupted && (
          <p className="mt-1 text-sm text-muted">{kilometres(best.metres)} · free-flow estimate</p>
        )}
        <button
          type="button"
          onClick={start}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[6px] bg-foreground px-4 text-base font-medium text-inverse"
        >
          {result.usual_seconds != null ? "Got it" : "Start trip"}
          <ArrowRight size={18} className="ml-2" aria-hidden />
        </button>
        {result.usual_seconds != null && result.routes.length > 1 && (
          <Link
            to="/alternatives"
            search={trip}
            className="mt-2 inline-flex min-h-11 items-center rounded-[6px] px-1 text-base underline underline-offset-4 hover:bg-surface-hover"
          >
            Show other options
          </Link>
        )}
      </section>

      {result.usual_seconds == null && result.routes.length > 1 && (
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
                {i === 0 ? "Quickest" : names[i] ? `Via ${names[i]}` : `Option ${i + 1}`}
                <small>{kilometres(r.metres)}</small>
              </span>
              <strong>{minutes(r.seconds)}</strong>
            </button>
          ))}
        </section>
      )}
    </>
  );

  return (
    <MapScreen position={position} routes={mapRoutes} label={`Routes to ${destination.name}`}>
      <div className="space-y-4">
        <header className={disrupted ? "sr-only" : "planner-heading"}>
          <h1>Where are you going?</h1>
        </header>

        {!disrupted && closures.length > 0 && (
          <section className="space-y-2">
            {closures.map((c) => (
              <div key={c.id} className="rounded-[6px] bg-surface p-4">
                <ClosureLine closure={c} />
              </div>
            ))}
          </section>
        )}

        {disrupted && routeBlock}

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

        {best && !disrupted && (
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

        {!disrupted && routeBlock}

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

function ClosureLine({ closure }: { closure: Closure }) {
  const { icon: Icon, word } =
    CLOSURE_KIND[closure.kind as keyof typeof CLOSURE_KIND] ?? CLOSURE_KIND.closure;
  return (
    <div>
      <p className="flex items-start gap-2 text-base font-medium text-alert">
        <Icon size={20} className="mt-0.5 shrink-0" aria-hidden />
        {closure.reason}
      </p>
      <p className="text-base text-muted">
        {word} until about {clock(closure.ends)}
      </p>
    </div>
  );
}
