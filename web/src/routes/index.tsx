import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bike, Bus, Car, Crosshair, TriangleAlert, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { RouteMap, type MapRoute } from "@/components/mod/route-map";
import { Screen } from "@/components/mod/ui";
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
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [closures, setClosures] = useState<Closure[]>([]);

  // What is shut is the reason this product exists, so it loads whether or not
  // the traveller has shared a position yet.
  useEffect(() => {
    getClosures()
      .then(setClosures)
      .catch(() => setClosures([]));
  }, []);

  const origin: Point | null = position.point;

  useEffect(() => {
    if (!origin) return;
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
  }, [origin, destination, vehicle]);

  const best = result?.routes[0];
  const mapRoutes: MapRoute[] =
    result?.routes.map((r, i) => ({
      geometry: r.geometry,
      tone: i === 0 ? ("assigned" as const) : ("other" as const),
    })) ?? [];

  return (
    <Screen>
      <div className="space-y-5">
        <header className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:hidden">
            MOD <span className="font-deva text-muted">मोड</span>
          </h1>
          <p className="text-base text-muted sm:text-lg">Where are you going?</p>
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
                  {c.kind} · clears in {until(c.ends)}. Your route below already avoids it.
                </p>
              </div>
            ))}
          </section>
        )}

        {!origin && (
          <section className="rounded-[6px] bg-surface p-4">
            <h2 className="flex items-center gap-2 text-lg font-medium">
              <Crosshair size={20} aria-hidden /> Find me
            </h2>
            <p className="mt-1 text-base text-muted">
              {position.status === "denied"
                ? "Location is blocked. Allow it in your browser settings to get a route from where you are."
                : "MOD needs your position to work out which way you should go."}
            </p>
            <button
              type="button"
              onClick={position.ask}
              className="mt-4 inline-flex min-h-11 items-center rounded-[6px] bg-foreground px-4 text-base font-medium text-inverse"
            >
              {position.status === "asking" ? "Finding you…" : "Use my location"}
            </button>
          </section>
        )}

        {origin && (
          <section className="space-y-3">
            <p className="text-sm text-muted">
              You are here, to within {Math.round(position.accuracy ?? 0)} m.
            </p>

            <div className="flex flex-wrap gap-2">
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

            <label className="block">
              <span className="text-sm text-muted">Going to</span>
              <select
                value={destination.name}
                onChange={(e) =>
                  setDestination(
                    PLACES.find((p) => p.name === e.target.value) ?? DEFAULT_DESTINATION,
                  )
                }
                className="mt-1 min-h-11 w-full rounded-[6px] border border-border bg-background px-3 text-base"
              >
                {PLACES.map((p) => (
                  <option key={p.name}>{p.name}</option>
                ))}
              </select>
            </label>
          </section>
        )}

        {state === "error" && (
          <section className="rounded-[6px] bg-surface p-4">
            <h2 className="text-lg font-medium">The route service did not answer</h2>
            <p className="mt-1 text-base text-muted">
              Nothing is wrong with your trip. Try again in a moment.
            </p>
          </section>
        )}

        {origin && state === "loading" && !result && (
          <div className="h-[220px] w-full rounded-[6px] bg-surface" />
        )}

        {best && (
          <>
            <RouteMap routes={mapRoutes} label={`Route to ${destination.name}`} />

            <section className="rounded-[6px] bg-surface p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-medium">To {destination.name}</h2>
                <span className="text-lg font-semibold">{minutes(best.seconds)}</span>
              </div>
              <p className="mt-1 text-base text-muted">
                {kilometres(best.metres)} · free-flow estimate, not live traffic
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/trip" })}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[6px] bg-foreground px-4 text-base font-medium text-inverse"
              >
                Start trip
              </button>
            </section>

            {result.routes.length > 1 && (
              <section className="space-y-2">
                <h2 className="text-base font-medium">
                  {result.routes.length - 1} other way
                  {result.routes.length > 2 ? "s" : ""}
                </h2>
                {result.routes.slice(1).map((r, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between rounded-[6px] bg-surface p-3"
                  >
                    <span className="text-base text-muted">Alternative {i + 1}</span>
                    <span className="text-base">
                      {minutes(r.seconds)} · {kilometres(r.metres)}
                    </span>
                  </div>
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
      </div>
    </Screen>
  );
}
