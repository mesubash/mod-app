import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Console } from "@/components/mod/console";
import {
  clearClosure,
  getClosures,
  getSpread,
  until,
  type Closure,
  type SpreadSplit,
} from "@/lib/api";
import { VEHICLES, nearest } from "@/lib/places";

export const Route = createFileRoute("/operator/live")({
  head: () => ({
    meta: [
      { title: "Live view — MOD operator console" },
      {
        name: "description",
        content: "Every disruption currently published, and when each clears.",
      },
    ],
  }),
  component: LiveView,
});

const TOKEN_KEY = "mod.operator.token";

// Below this many diverted travellers, spreading is not balancing load, it is
// a handful of people -- see docs/phases.md, Phase 6: "Below a density
// threshold this changes nothing." ponytail: a fixed guess, not a measured
// threshold; replace it once Phase 3 says how many travellers the corridor
// needs.
const MEANINGFUL_SPREAD_TOTAL = 10;

function LiveView() {
  const [closures, setClosures] = useState<Closure[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [splits, setSplits] = useState<SpreadSplit[]>([]);
  const [splitDenied, setSplitDenied] = useState(false);
  const [spreadWindowMinutes, setSpreadWindowMinutes] = useState(120);

  const refresh = () => {
    getClosures()
      .then((c) => {
        setClosures(c);
        setFailed(false);
      })
      .catch(() => setFailed(true));
    getSpread(localStorage.getItem(TOKEN_KEY) ?? "")
      .then((r) => {
        setSplits(r.splits);
        setSpreadWindowMinutes(r.window_minutes);
        setSplitDenied(false);
      })
      .catch(() => {
        setSplits([]);
        setSplitDenied(true);
      });
  };

  useEffect(() => {
    refresh();
    // A duty officer leaves this open on a desk, so it refreshes on its own.
    const timer = setInterval(refresh, 30_000);
    return () => clearInterval(timer);
  }, []);

  function clear(id: number) {
    const token = localStorage.getItem(TOKEN_KEY) ?? "";
    clearClosure(token, id)
      .then(refresh)
      .catch(() => setNote("Could not clear. The operator token may have changed."));
  }

  return (
    <Console>
      <h2 className="mb-4 text-lg font-medium">Live view</h2>

      {failed && <p className="text-base text-alert">The service did not answer.</p>}

      {!failed && closures === null && <p className="text-base text-muted">Loading…</p>}

      {closures !== null && closures.length === 0 && (
        <p className="text-base text-muted">Nothing is shut.</p>
      )}

      {note && <p className="mb-4 text-base text-muted">{note}</p>}

      {closures && closures.length > 0 && (
        <div className="max-w-[52rem] space-y-3">
          {closures.map((c) => (
            <div key={c.id} className="rounded-[6px] bg-surface p-3">
              <p className="text-base font-medium">{c.reason}</p>
              <p className="mt-1 text-sm text-muted">
                {c.kind} · {c.edges.length} link · clears in {until(c.ends)}
              </p>
              <button
                type="button"
                onClick={() => clear(c.id)}
                className="mt-2 text-base underline underline-offset-4"
              >
                Clear now
              </button>
            </div>
          ))}
        </div>
      )}

      <section className="mt-8 max-w-[52rem] space-y-3">
        <h2 className="text-lg font-medium">How assignments have split</h2>

        {splitDenied ? (
          <p className="text-base text-muted">
            Enter the operator token on Post a disruption to see how travellers have split.
          </p>
        ) : splits.length === 0 ? (
          <p className="text-base text-muted">
            No affected travellers in the last {spreadWindowMinutes} minutes.
          </p>
        ) : (
          <>
            <p className="text-base text-muted">
              Diverted travellers who accepted each alternative in the last {spreadWindowMinutes}{" "}
              minutes, and how many of those later said they took it.
            </p>
            {splits.reduce((a, s) => a + s.counts.reduce((x, y) => x + y, 0), 0) <
              MEANINGFUL_SPREAD_TOTAL && (
              <p className="text-base text-muted">
                Fewer than {MEANINGFUL_SPREAD_TOTAL} diverted travellers in this window. At this
                volume, spreading is not meaningfully balancing anything yet.
              </p>
            )}
            {splits.map((s) => (
              <div key={s.key} className="rounded-[6px] bg-surface p-4">
                <h3 className="text-base font-medium">
                  {nearest(s.origin).name} to {nearest(s.destination).name},{" "}
                  {VEHICLES.find((v) => v.id === s.vehicle)?.label.toLowerCase() ?? s.vehicle}
                </h3>
                <table className="split-table mt-2 w-full text-left text-base">
                  <thead className="text-muted">
                    <tr>
                      <th className="font-normal">Route</th>
                      <th className="font-normal">Assigned</th>
                      <th className="font-normal">Said they took it</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.counts.map((n, i) => (
                      <tr key={i}>
                        <td data-label="Route">Option {i + 1}</td>
                        <td data-label="Assigned">{n}</td>
                        <td data-label="Said they took it">
                          {s.answered[i]
                            ? `${s.took[i]} of ${s.answered[i]} who answered`
                            : "No answers yet"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}
      </section>
    </Console>
  );
}
