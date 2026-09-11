import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Screen, PageTitle, Meta, TextLink } from "@/components/mod/ui";

export const Route = createFileRoute("/after-trip")({
  head: () => ({
    meta: [
      { title: "Two questions about your trip — MOD" },
      {
        name: "description",
        content:
          "Did you take the suggested route, and did you already know it? Two taps, then done.",
      },
      { property: "og:title", content: "Two questions about your trip — MOD" },
      {
        property: "og:description",
        content:
          "Did you take the suggested route, and did you already know it? Two taps, then done.",
      },
    ],
  }),
  component: AfterTrip,
});

const choice =
  "min-h-[2.75rem] rounded-md bg-surface px-4 py-3 text-base font-medium hover:bg-surface-hover";
const chosen =
  "min-h-[2.75rem] rounded-md bg-foreground px-4 py-3 text-base font-medium text-inverse";

function AfterTrip() {
  const [took, setTook] = useState<string | null>(null);
  const [knew, setKnew] = useState<string | null>(null);

  return (
    <Screen>
      <div className="space-y-10">
        <header className="space-y-2">
          <PageTitle>You arrived at 09:04</PageTitle>
          <Meta>Jadibuti to Maitighar, via Old Baneshwor.</Meta>
        </header>

        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">Did you take the suggested route?</legend>
          <div className="flex flex-wrap gap-2">
            {["Yes", "No", "Partly"].map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setTook(o)}
                className={took === o ? chosen : choice}
              >
                {o}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">Did you already know this route?</legend>
          <div className="flex flex-wrap gap-2">
            {["Yes", "No"].map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setKnew(o)}
                className={knew === o ? chosen : choice}
              >
                {o}
              </button>
            ))}
          </div>
        </fieldset>

        {took && knew ? (
          <p className="text-confirm">Both answers saved. Nothing else to do.</p>
        ) : (
          <Meta>Answer both and this screen closes itself.</Meta>
        )}

        <div className="border-t border-border pt-6">
          <TextLink to="/">Back to your route</TextLink>
        </div>
      </div>
    </Screen>
  );
}
