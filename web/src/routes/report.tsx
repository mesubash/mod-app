import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Screen, PageTitle, Meta, TextLink, BackLink } from "@/components/mod/ui";
import { reportKinds } from "@/lib/mod-data";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a problem on the road — MOD" },
      {
        name: "description",
        content:
          "One tap to report a jam, flooding, a closed road or an accident, with your position attached.",
      },
      { property: "og:title", content: "Report a problem on the road — MOD" },
      {
        property: "og:description",
        content:
          "One tap to report a jam, flooding, a closed road or an accident, with your position attached.",
      },
    ],
  }),
  component: Report,
});

function Report() {
  const [sent, setSent] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  return (
    <Screen>
      <div className="space-y-8">
        <BackLink to="/trip">Back to trip</BackLink>

        <header className="space-y-2">
          <PageTitle>What do you see?</PageTitle>
          <Meta>Your position on Old Baneshwor is sent with the report.</Meta>
        </header>

        <ul className="space-y-2">
          {reportKinds.map((kind) => (
            <li key={kind}>
              <button
                type="button"
                onClick={() => {
                  setFailed(false);
                  setSent(kind);
                }}
                className="min-h-[3.5rem] w-full rounded-md bg-surface px-4 py-4 text-left text-lg font-medium hover:bg-surface-hover"
              >
                {kind}
              </button>
            </li>
          ))}
        </ul>

        {sent ? <p className="text-confirm">{sent} reported at Old Baneshwor. Thank you.</p> : null}

        {failed ? (
          <p role="alert">
            The report did not send — no signal here. It will send by itself when you have signal
            again.
          </p>
        ) : null}

        <div className="space-y-2 border-t border-border pt-6">
          <TextLink to="/trip">Done</TextLink>
          <div>
            <button
              type="button"
              onClick={() => {
                setSent(null);
                setFailed(true);
              }}
              className="min-h-[2.75rem] rounded-md px-1 text-base text-muted underline underline-offset-4 hover:bg-surface-hover"
            >
              Show send failure state
            </button>
          </div>
        </div>
      </div>
    </Screen>
  );
}
