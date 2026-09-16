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

// Below this many affected travellers, round-robin is not "balancing load,"
// it's two or three requests -- see docs/phases.md, Phase 6: "Below a
// density threshold this changes nothing... be honest about that."
const MEANINGFUL_SPREAD_TOTAL = 10;

function LiveView() {
  const [closures, setClosures] = useState<Closure[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [splits, setSplits] = useState<SpreadSplit[]>([]);
  const [spreadWindowMinutes, setSpreadWindowMinutes] = useState(120);

  const refresh = () => {
    getClosures()
      .then((c) => {
        setClosures(c);
        setFailed(false);
      })
      .catch(() => setFailed(true));
    getSpread()
      .then((r) => {
        setSplits(r.splits);
        setSpreadWindowMinutes(r.window_minutes);
      })
      .catch(() => setSplits([]));
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

        {splits.length === 0 ? (
          <p className="text-base text-muted">
            No affected travellers in the last {spreadWindowMinutes} minutes.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              An affected traveller's leading alternative, last {spreadWindowMinutes} minutes. Keys
              are graph node ids, not place names -- there is no reverse-geocoder.
            </p>
            {splits.reduce((a, s) => a + s.counts.reduce((x, y) => x + y, 0), 0) <
              MEANINGFUL_SPREAD_TOTAL && (
              <p className="text-sm text-muted">
                Fewer than {MEANINGFUL_SPREAD_TOTAL} affected requests in this window. At this
                volume, spreading is not meaningfully balancing anything yet.
              </p>
            )}
            {splits.map((s) => {
              const max = Math.max(...s.counts, 1);
              return (
                <div key={s.key} className="rounded-[6px] bg-surface p-3">
                  <p className="font-mono text-xs text-muted">{s.key}</p>
                  <div className="mt-2 space-y-1">
                    {s.counts.map((n, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-14 shrink-0 text-sm text-muted">Alt {i + 1}</span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-border">
                          <div
                            className="h-3 rounded-full bg-foreground"
                            style={{ width: `${(n / max) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 shrink-0 text-right text-sm">{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>
    </Console>
  );
}
