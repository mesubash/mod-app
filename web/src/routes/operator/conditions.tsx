import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Cell, Console } from "@/components/mod/console";
import { Meta, PageTitle, PrimaryButton } from "@/components/mod/ui";
import { reportedConditions } from "@/lib/mod-data";

export const Route = createFileRoute("/operator/conditions")({
  head: () => ({
    meta: [
      { title: "Reported conditions — MOD operator console" },
      {
        name: "description",
        content:
          "What travellers are reporting right now, with the current flow on each link before anything is closed.",
      },
      { property: "og:title", content: "Reported conditions — MOD operator console" },
      {
        property: "og:description",
        content:
          "What travellers are reporting right now, with the current flow on each link before anything is closed.",
      },
    ],
  }),
  component: Conditions,
});

type View = "reports" | "empty" | "loading" | "error";

// A link already at a standstill cannot be emptied by closing it, so the
// console states that instead of offering the action.
const STOPPED_VEH_PER_HOUR = 100;

function Conditions() {
  const [view, setView] = useState<View>("reports");
  const [closed, setClosed] = useState<string | null>(null);

  return (
    <Console current="/operator/conditions">
      <div className="space-y-8">
        <header className="space-y-2">
          <PageTitle>Reported conditions</PageTitle>
          <Meta>
            Sent by travellers on the road, newest first. Flow is measured on the link, not
            reported.
          </Meta>
        </header>

        {view === "loading" && (
          <section className="space-y-3" aria-busy="true">
            <p className="text-lg">Loading reports…</p>
            <div className="h-4 w-3/4 max-w-[28rem] rounded-md bg-surface" />
            <div className="h-4 w-2/3 max-w-[24rem] rounded-md bg-surface" />
            <div className="h-4 w-1/2 max-w-[20rem] rounded-md bg-surface" />
          </section>
        )}

        {view === "error" && (
          <section className="max-w-[80ch] space-y-4">
            <h2 className="text-lg font-semibold">Reports are not coming through</h2>
            <Meta>
              The last report reached the console at 08:24. Travellers may still be reporting; this
              list is not current, so do not treat it as quiet.
            </Meta>
            <PrimaryButton onClick={() => setView("reports")}>Try again</PrimaryButton>
          </section>
        )}

        {view === "empty" && (
          <section className="max-w-[80ch] space-y-4">
            <h2 className="text-lg font-semibold">Nothing reported in the last hour</h2>
            <Meta>
              The corridor is running normally. Reports appear here within seconds of being sent.
            </Meta>
          </section>
        )}

        {view === "reports" && (
          <section className="space-y-3">
            <table className="w-full text-base max-sm:block">
              <thead className="max-sm:hidden">
                <tr className="border-b border-border text-left text-muted">
                  <th scope="col" className="py-2 font-normal sm:px-3 sm:first:pl-0">
                    What
                  </th>
                  <th scope="col" className="py-2 font-normal sm:px-3">
                    Where
                  </th>
                  <th scope="col" className="py-2 font-normal sm:px-3">
                    Reports
                  </th>
                  <th scope="col" className="py-2 font-normal sm:px-3">
                    Last report
                  </th>
                  <th scope="col" className="py-2 font-normal sm:px-3">
                    Flow now
                  </th>
                  <th scope="col" className="py-2 font-normal sm:px-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="max-sm:block">
                {reportedConditions.map((row) => {
                  const stopped = row.flow < STOPPED_VEH_PER_HOUR;
                  return (
                    <tr
                      key={`${row.what}-${row.where}`}
                      className="border-b border-border max-sm:block max-sm:py-3"
                    >
                      <Cell label="What">
                        <span className="font-medium">{row.what}</span>
                      </Cell>
                      <Cell label="Where">{row.where}</Cell>
                      <Cell label="Reports">{row.reports}</Cell>
                      <Cell label="Last report">{row.when}</Cell>
                      <Cell label="Flow now">
                        {row.flow} veh/h, {row.flowNote}
                      </Cell>
                      <Cell label="Action">
                        {stopped ? (
                          <span className="text-muted">
                            Already stopped — closing it removes nothing
                          </span>
                        ) : closed === row.where ? (
                          <span className="text-confirm">Closed at 08:46</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setClosed(row.where)}
                            className="min-h-[2.75rem] rounded-md px-1 text-left font-medium underline underline-offset-4 hover:bg-surface-hover"
                          >
                            Close this link
                          </button>
                        )}
                      </Cell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Meta>
              Closing a link posts a disruption on it and reassigns everyone routed through it. Two
              links carrying under 100 veh/h are left alone: they are already stopped.
            </Meta>
          </section>
        )}

        <nav className="space-y-2 border-t border-border pt-6">
          <p className="text-base text-muted">Other states, for review</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(
              [
                ["reports", "Reports coming in"],
                ["empty", "Nothing reported"],
                ["loading", "Loading"],
                ["error", "Not receiving"],
              ] as [View, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={`min-h-[2.75rem] rounded-md px-2 text-base hover:bg-surface-hover ${
                  view === key ? "bg-surface font-medium" : "text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </Console>
  );
}
