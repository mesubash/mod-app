import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Screen } from "@/components/mod/ui";
import { postTripAnswer } from "@/lib/api";

export const Route = createFileRoute("/after-trip")({
  head: () => ({
    meta: [
      { title: "After your trip — MOD" },
      {
        name: "description",
        content: "Two questions, one tap each. They are what MOD learns from.",
      },
    ],
  }),
  component: AfterTrip,
});

const choice = "min-h-11 rounded-[6px] bg-surface px-4 text-base hover:bg-surface-hover";
const chosen = "min-h-11 rounded-[6px] bg-foreground px-4 text-base text-inverse";

function AfterTrip() {
  const [took, setTook] = useState<string | null>(null);
  const [knew, setKnew] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  // Send once both are answered. Two taps and done; there is no submit button
  // because a form is exactly what would stop people answering.
  useEffect(() => {
    if (!took || !knew || saved) return;
    postTripAnswer(took, knew)
      .then(() => setSaved(true))
      .catch(() => setFailed(true));
  }, [took, knew, saved]);

  return (
    <Screen>
      <div className="space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Two quick questions</h1>
          <p className="text-base text-muted">
            Nothing identifying you is stored with the answers.
          </p>
        </header>

        <fieldset className="space-y-3">
          <legend className="text-lg font-medium">Did you take the suggested route?</legend>
          <div className="flex flex-wrap gap-2">
            {["yes", "no", "partly"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setTook(v)}
                aria-pressed={took === v}
                className={took === v ? chosen : choice}
              >
                {v[0]!.toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-lg font-medium">Did you already know this route?</legend>
          <div className="flex flex-wrap gap-2">
            {["yes", "no"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setKnew(v)}
                aria-pressed={knew === v}
                className={knew === v ? chosen : choice}
              >
                {v[0]!.toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>

        {saved && (
          <p className="text-base text-confirm">
            Thank you. The second answer is the one that tells us whether this is worth building.
          </p>
        )}
        {failed && (
          <p className="text-base text-alert">
            That did not save. It is not important enough to ask you again.
          </p>
        )}

        <Link to="/" className="inline-block text-base underline underline-offset-4">
          Done
        </Link>
      </div>
    </Screen>
  );
}
