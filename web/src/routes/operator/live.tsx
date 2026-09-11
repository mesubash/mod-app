import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Cell, Console } from "@/components/mod/console";
import { Meta, PageTitle, PrimaryButton } from "@/components/mod/ui";
import { activeDisruption, assignmentSplit } from "@/lib/mod-data";

export const Route = createFileRoute("/operator/live")({
  head: () => ({
    meta: [
      { title: "Live view — MOD operator console" },
      {
        name: "description",
        content:
          "The active disruption, how many travellers were notified, and how the assignments split across the alternatives.",
      },
      { property: "og:title", content: "Live view — MOD operator console" },
      {
        property: "og:description",
        content:
          "The active disruption, how many travellers were notified, and how the assignments split across the alternatives.",
      },
    ],
  }),
  component: LiveView,
});

type View = "active" | "confirming" | "cleared" | "none" | "loading" | "error";

function LiveView() {
  const [view, setView] = useState<View>("active");

  return (
    <Console current="/operator/live">
      <div className="space-y-8">
        <header className="space-y-2">
          <PageTitle>Live view</PageTitle>
          <Meta>Assignments update as travellers accept or override them.</Meta>
        </header>

        {view === "loading" && (
          <section className="space-y-3" aria-busy="true">
            <p className="text-lg">Loading the active disruption…</p>
            <div className="h-4 w-3/4 max-w-[28rem] rounded-md bg-surface" />
            <div className="h-4 w-1/2 max-w-[20rem] rounded-md bg-surface" />
          </section>
        )}

        {view === "error" && (
          <section className="max-w-[80ch] space-y-4">
            <h2 className="text-lg font-semibold">The live view is not updating</h2>
            <Meta>
              The console last heard from the assignment service at 08:19. The disruption is still
              published and travellers are still being advised — only these figures are stale.
            </Meta>
            <PrimaryButton onClick={() => setView("active")}>Try again</PrimaryButton>
          </section>
        )}

        {view === "none" && (
          <section className="max-w-[80ch] space-y-4">
            <h2 className="text-lg font-semibold">No disruption is live</h2>
            <Meta>
              Nothing has been published since 06:00. Travellers are being told their routes are
              clear.
            </Meta>
          </section>
        )}

        {view === "cleared" && (
          <section className="max-w-[80ch] space-y-4">
            <p className="text-confirm">{activeDisruption.segment} cleared at 08:47.</p>
            <Meta>
              {activeDisruption.notified} travellers have been told the road is open again. Anyone
              already on an alternative keeps it — they are not turned around.
            </Meta>
          </section>
        )}

        {(view === "active" || view === "confirming") && (
          <>
            <section className="max-w-[80ch] space-y-4">
              <p className="text-alert">{activeDisruption.headline}</p>
              <dl className="space-y-1 text-base">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted">Posted</dt>
                  <dd>{activeDisruption.posted}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted">Expected</dt>
                  <dd>{activeDisruption.expected}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted">Notified</dt>
                  <dd>{activeDisruption.notified} travellers</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">How the assignments split</h2>
              <table className="w-full max-w-[52rem] text-base max-sm:block">
                <thead className="max-sm:hidden">
                  <tr className="border-b border-border text-left text-muted">
                    <th scope="col" className="py-2 font-normal sm:px-3 sm:first:pl-0">
                      Route
                    </th>
                    <th scope="col" className="py-2 font-normal sm:px-3">
                      Assigned
                    </th>
                    <th scope="col" className="py-2 font-normal sm:px-3">
                      Reported compliance
                    </th>
                  </tr>
                </thead>
                <tbody className="max-sm:block">
                  {assignmentSplit.map((row) => (
                    <tr key={row.route} className="border-b border-border max-sm:block max-sm:py-3">
                      <Cell label="Route">
                        <span className="font-medium">{row.route}</span>
                      </Cell>
                      <Cell label="Assigned">{row.assigned}</Cell>
                      <Cell label="Compliance">{row.compliance}</Cell>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Meta>
                329 travellers were notified; 329 are assigned. Compliance is what travellers
                reported after their trip, not what was observed.
              </Meta>
            </section>

            <section className="max-w-[80ch] space-y-4 pt-2">
              {view === "confirming" ? (
                <>
                  <p className="text-lg">
                    Clear {activeDisruption.segment}? Advice stops for {activeDisruption.notified}{" "}
                    travellers and the road is reported open again.
                  </p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <PrimaryButton onClick={() => setView("cleared")}>
                      Clear disruption
                    </PrimaryButton>
                    <button
                      type="button"
                      onClick={() => setView("active")}
                      className="min-h-[2.75rem] rounded-md px-1 text-base font-medium underline underline-offset-4 hover:bg-surface-hover"
                    >
                      Keep it live
                    </button>
                  </div>
                </>
              ) : (
                <PrimaryButton onClick={() => setView("confirming")}>
                  Clear disruption
                </PrimaryButton>
              )}
            </section>
          </>
        )}

        <nav className="space-y-2 border-t border-border pt-6">
          <p className="text-base text-muted">Other states, for review</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(
              [
                ["active", "Active disruption"],
                ["none", "Nothing live"],
                ["cleared", "Just cleared"],
                ["loading", "Loading"],
                ["error", "Not updating"],
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
