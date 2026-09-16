import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Console } from "@/components/mod/console";
import { clearClosure, getClosures, until, type Closure } from "@/lib/api";

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

function LiveView() {
  const [closures, setClosures] = useState<Closure[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const refresh = () =>
    getClosures()
      .then((c) => {
        setClosures(c);
        setFailed(false);
      })
      .catch(() => setFailed(true));

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
    </Console>
  );
}
