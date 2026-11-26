import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Console } from "@/components/mod/console";
import { RouteMap, type MapRoute } from "@/components/mod/route-map";
import {
  clearClosure,
  fetchRoutes,
  getClosures,
  getFlow,
  postClosure,
  until,
  type Closure,
  type Flow,
} from "@/lib/api";
import { PLACES, nearPlace } from "@/lib/places";

export const Route = createFileRoute("/operator/")({
  head: () => ({
    meta: [
      { title: "Post a disruption — MOD operator console" },
      {
        name: "description",
        content: "Close a link and see what it does to the travellers on that road.",
      },
    ],
  }),
  component: Operator,
});

const KINDS = ["closure", "accident", "weather", "event"] as const;
const TOKEN_KEY = "mod.operator.token";

function Operator() {
  const [token, setToken] = useState("");
  const [from, setFrom] = useState(PLACES[2]!);
  const [to, setTo] = useState(PLACES[PLACES.length - 1]!);
  const [edges, setEdges] = useState<string[]>([]);
  const [geometry, setGeometry] = useState<[number, number][]>([]);
  const [pick, setPick] = useState<number | null>(null);
  const [reason, setReason] = useState("VIP movement");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("closure");
  const [minutes, setMinutes] = useState(60);
  const [active, setActive] = useState<Closure[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [flow, setFlow] = useState<Flow | null | "failed">(null);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY) ?? "");
  }, []);

  const refresh = () =>
    getClosures()
      .then(setActive)
      .catch(() => setActive([]));
  useEffect(() => {
    refresh();
  }, []);

  // Closing a link means naming an edge, and an operator has no edge ids in
  // their head. Routing between two junctions gives a concrete list to choose
  // from, which is the nearest thing to pointing at the map.
  useEffect(() => {
    fetchRoutes(from.point, to.point, "car")
      .then((r) => {
        setEdges(r.routes[0]?.edges ?? []);
        setGeometry(r.routes[0]?.geometry ?? []);
        setPick(r.routes[0] ? Math.floor(r.routes[0].edges.length / 2) : null);
      })
      .catch(() => setEdges([]));
  }, [from, to]);

  const picked = pick !== null ? edges[pick] : undefined;
  useEffect(() => {
    setFlow(null);
    if (!picked) return;
    let cancelled = false;
    getFlow(picked)
      .then((f) => !cancelled && setFlow(f))
      .catch(() => !cancelled && setFlow("failed"));
    return () => {
      cancelled = true;
    };
  }, [picked]);

  async function publish() {
    if (pick === null || !edges[pick]) return;
    try {
      await postClosure(token, { edges: [edges[pick]], reason, kind, minutes });
      localStorage.setItem(TOKEN_KEY, token);
      setNote("Published. Travellers routing through that link are already avoiding it.");
      refresh();
    } catch {
      setNote("Not published. Check the operator token.");
    }
  }

  const mapRoutes: MapRoute[] = geometry.length
    ? [
        { geometry, tone: "other" },
        ...(pick !== null && geometry[pick + 1]
          ? [{ geometry: [geometry[pick]!, geometry[pick + 1]!], tone: "closed" as const }]
          : []),
      ]
    : [];

  return (
    <Console>
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Post a disruption</h2>

          <div className="flex flex-wrap gap-3">
            <label className="text-sm text-muted">
              From
              <select
                value={from.name}
                onChange={(e) => setFrom(PLACES.find((p) => p.name === e.target.value) ?? from)}
                className="mt-1 block min-h-11 rounded-[6px] border border-border bg-background px-3 text-base"
              >
                {PLACES.map((p) => (
                  <option key={p.name}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted">
              To
              <select
                value={to.name}
                onChange={(e) => setTo(PLACES.find((p) => p.name === e.target.value) ?? to)}
                className="mt-1 block min-h-11 rounded-[6px] border border-border bg-background px-3 text-base"
              >
                {PLACES.map((p) => (
                  <option key={p.name}>{p.name}</option>
                ))}
              </select>
            </label>
          </div>

          {geometry.length > 0 && (
            <RouteMap routes={mapRoutes} height={240} label={`${from.name} to ${to.name}`} />
          )}

          <label className="block text-sm text-muted">
            Link to close ({edges.length} on this route)
            <select
              value={pick ?? ""}
              onChange={(e) => setPick(Number(e.target.value))}
              className="mt-1 block min-h-11 w-full rounded-[6px] border border-border bg-background px-3 text-base"
            >
              {edges.map((edge, i) => (
                <option key={edge} value={i}>
                  {i + 1}.{" "}
                  {geometry[i] ? nearPlace({ lon: geometry[i]![0], lat: geometry[i]![1] }) : edge}
                </option>
              ))}
            </select>
          </label>

          <p className="text-base" role="status">
            {flow === null
              ? "Checking current speed on this link…"
              : flow === "failed"
                ? "Could not read current speed on this link."
                : flow.measured_kmh === null
                  ? `Current speed unknown: no traveller has crossed this link in the last ${flow.window_minutes} minutes.`
                  : `Moving at about ${flow.measured_kmh} km/h over the last ${flow.window_minutes} minutes.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="flex-1 text-sm text-muted">
              Reason
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 block min-h-11 w-full rounded-[6px] border border-border bg-background px-3 text-base"
              />
            </label>
            <label className="text-sm text-muted">
              Type
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
                className="mt-1 block min-h-11 rounded-[6px] border border-border bg-background px-3 text-base"
              >
                {KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted">
              Minutes
              <input
                type="number"
                min={5}
                max={720}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="mt-1 block min-h-11 w-24 rounded-[6px] border border-border bg-background px-3 text-base"
              />
            </label>
          </div>

          <label className="block text-sm text-muted">
            Operator token
            <input
              type="password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                localStorage.setItem(TOKEN_KEY, e.target.value);
              }}
              className="mt-1 block min-h-11 w-full rounded-[6px] border border-border bg-background px-3 text-base"
            />
          </label>

          <button
            type="button"
            onClick={publish}
            disabled={pick === null || !token}
            className="inline-flex min-h-11 items-center rounded-[6px] bg-foreground px-4 text-base font-medium text-inverse disabled:opacity-40"
          >
            Publish disruption
          </button>

          {note && <p className="text-base text-muted">{note}</p>}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Active now</h2>
          {active.length === 0 && <p className="text-base text-muted">Nothing is shut.</p>}
          {active.map((c) => (
            <div key={c.id} className="rounded-[6px] bg-surface p-3">
              <p className="text-base font-medium">{c.reason}</p>
              <p className="mt-1 text-sm text-muted">
                {c.kind} · {c.edges.length} link · clears in {until(c.ends)}
              </p>
              <button
                type="button"
                onClick={() =>
                  clearClosure(token, c.id)
                    .then(refresh)
                    .catch(() => setNote("Could not clear. Check the token."))
                }
                className="mt-2 text-base underline underline-offset-4"
              >
                Clear now
              </button>
            </div>
          ))}
        </section>
      </div>
    </Console>
  );
}
