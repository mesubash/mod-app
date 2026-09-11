import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Screen, Meta, TextLink, BackLink } from "@/components/mod/ui";
import { reAdvice } from "@/lib/mod-data";

export const Route = createFileRoute("/re-advice")({
  head: () => ({
    meta: [
      { title: "A better route just opened — MOD" },
      {
        name: "description",
        content:
          "Flooding at Thapathali. Switch via Maitighar, about 8 minutes faster, or stay on your current route.",
      },
      { property: "og:title", content: "A better route just opened — MOD" },
      {
        property: "og:description",
        content:
          "Flooding at Thapathali. Switch via Maitighar, about 8 minutes faster, or stay on your current route.",
      },
    ],
  }),
  component: ReAdvice,
});

function ReAdvice() {
  const [decision, setDecision] = useState<"switch" | "stay" | null>(null);

  const button =
    "min-h-[2.75rem] w-full rounded-md bg-foreground px-5 py-3 text-base font-medium text-inverse hover:bg-foreground/90 sm:w-auto sm:min-w-[12rem]";

  return (
    <Screen>
      <div className="space-y-10">
        <BackLink to="/trip">Back to trip</BackLink>

        <div className="space-y-6">
          <Meta>{reAdvice.seenAt}</Meta>
          <p className="text-xl break-words sm:text-2xl">{reAdvice.what}</p>
          <p className="text-2xl font-semibold break-words sm:text-3xl">{reAdvice.advice}</p>
          <Meta>
            Your current route still gets you there. This is the only change we will offer for the
            next few minutes.
          </Meta>
        </div>

        {decision === null ? (
          <div className="flex flex-col gap-3 pt-6 sm:flex-row">
            <button type="button" className={button} onClick={() => setDecision("switch")}>
              Switch
            </button>
            <button type="button" className={button} onClick={() => setDecision("stay")}>
              Stay on this route
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-6">
            <p className="text-confirm">
              {decision === "switch"
                ? "Switched — you are now on Maitighar."
                : "Staying on Old Baneshwor. We will not ask again for a few minutes."}
            </p>
            <TextLink to="/trip">Back to trip</TextLink>
          </div>
        )}
      </div>
    </Screen>
  );
}
