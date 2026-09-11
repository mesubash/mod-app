import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Screen, PageTitle, Meta, PrimaryButton, TextLink, BackLink } from "@/components/mod/ui";
import { alternatives, disruption } from "@/lib/mod-data";

export const Route = createFileRoute("/alternatives")({
  head: () => ({
    meta: [
      { title: "Other routes around the closure — MOD" },
      {
        name: "description",
        content:
          "The other viable routes around the Tinkune–Koteshwor closure, with the extra time each one costs.",
      },
      { property: "og:title", content: "Other routes around the closure — MOD" },
      {
        property: "og:description",
        content:
          "The other viable routes around the Tinkune–Koteshwor closure, with the extra time each one costs.",
      },
    ],
  }),
  component: Alternatives,
});

function Alternatives() {
  const [chosen, setChosen] = useState("Via Old Baneshwor");
  const empty = false;

  return (
    <Screen>
      <div className="space-y-8">
        <BackLink to="/">Back to your route</BackLink>

        <header className="space-y-2">
          <PageTitle>Other routes</PageTitle>
          <p className="text-alert">{disruption.headline}</p>
        </header>

        {empty ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">No alternative available</h2>
            <Meta>Sinamangal, Old Baneshwor and Thapathali are all stopped as of 08:22.</Meta>
          </section>
        ) : (
          <ul className="divide-y divide-border">
            {alternatives.map((a) => (
              <li key={a.route} className="py-5">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold break-words">{a.route}</h2>
                  <p>{a.cost}</p>
                  <Meta>
                    {a.load === "Assigned to you"
                      ? "Assigned to you"
                      : a.load === "Loaded most heavily"
                        ? "Loaded most heavily by MOD right now"
                        : "Lightly loaded right now"}
                    {" — "}
                    {a.note}
                  </Meta>
                  {chosen === a.route ? (
                    <p className="text-confirm">You are taking this route.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setChosen(a.route)}
                      className="min-h-[2.75rem] rounded-md px-1 text-base font-medium underline underline-offset-4 hover:bg-surface-hover"
                    >
                      Take this route instead
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-4 pt-4">
          <PrimaryButton>Done</PrimaryButton>
          <div>
            <TextLink to="/trip">Start trip</TextLink>
          </div>
        </div>
      </div>
    </Screen>
  );
}
