import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ReAdvicePrompt } from "@/components/mod/re-advice-prompt";
import { Screen, Meta, TextLink, BackLink } from "@/components/mod/ui";

export const Route = createFileRoute("/re-advice")({
  head: () => ({
    meta: [
      { title: "A better route just opened — MOD" },
      {
        name: "description",
        content: "A condition changed on your route. Switch, or stay on what you have.",
      },
    ],
  }),
  component: ReAdvice,
});

// Illustrative only -- there is no live trigger yet. A real prompt needs a
// running trip session that watches conditions on the road ahead and decides
// when to interrupt, which is not built (Phase 5). This screen exists so the
// interaction itself -- two equal-weight choices, no default -- is designed
// before that system exists to drive it.
const seenAt = "08:41";
const what = "Flooding at Thapathali.";
const advice = "Via Maitighar, about 8 minutes faster than staying on.";

function ReAdvice() {
  const [decision, setDecision] = useState<"switch" | "stay" | null>(null);

  return (
    <Screen>
      <div className="space-y-10">
        <BackLink to="/trip">Back to trip</BackLink>

        <Meta>{seenAt}</Meta>

        {decision === null ? (
          <ReAdvicePrompt
            what={what}
            advice={advice}
            onSwitch={() => setDecision("switch")}
            onStay={() => setDecision("stay")}
          />
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
