import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Screen,
  PageTitle,
  Meta,
  PrimaryButton,
  TextLink,
  Group,
  Label,
} from "@/components/mod/ui";
import { assignment, disruption, savedTrip } from "@/lib/mod-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOD — your route this morning" },
      {
        name: "description",
        content:
          "See whether the road ahead is disrupted and which alternative route is yours today.",
      },
      { property: "og:title", content: "MOD — your route this morning" },
      {
        property: "og:description",
        content:
          "See whether the road ahead is disrupted and which alternative route is yours today.",
      },
    ],
  }),
  component: Home,
});

type View = "disrupted" | "normal" | "none-available" | "loading" | "error";

function Home() {
  const [view, setView] = useState<View>("disrupted");
  const [accepted, setAccepted] = useState(false);

  return (
    <Screen>
      <div className="space-y-10">
        <header className="space-y-2">
          <Meta>{savedTrip.day}</Meta>
          <PageTitle>
            {savedTrip.from} to {savedTrip.to}
          </PageTitle>
          <Meta>
            Usual departure {savedTrip.departure} · {savedTrip.usualDuration}
          </Meta>
        </header>

        {view === "loading" && (
          <section className="space-y-3" aria-busy="true">
            <p className="text-lg">Checking the roads on your route…</p>
            <div className="h-4 w-3/4 rounded-md bg-surface" />
            <div className="h-4 w-1/2 rounded-md bg-surface" />
          </section>
        )}

        {view === "error" && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">We could not check your route just now</h2>
            <Meta>
              The connection dropped at 08:22. Nothing has been sent to you, so treat your usual
              route as unchanged until this loads.
            </Meta>
            <PrimaryButton onClick={() => setView("disrupted")}>Try again</PrimaryButton>
          </section>
        )}

        {view === "normal" && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">No disruptions on your route</h2>
            <Meta>Last checked 08:22. Your usual way through Tinkune is clear.</Meta>
            <div className="pt-2">
              <TextLink to="/trip">Start trip</TextLink>
            </div>
          </section>
        )}

        {view === "none-available" && (
          <section className="space-y-6">
            <p className="text-alert">{disruption.headline}</p>
            <h2 className="text-xl font-semibold">No alternative available</h2>
            <Meta>
              Every parallel road — Sinamangal, Old Baneshwor, Thapathali — is at a standstill as of
              08:22. Waiting where you are is better than moving to another queue. We will advise
              you when one clears.
            </Meta>
            <div className="pt-2">
              <TextLink to="/how-it-works">How this works</TextLink>
            </div>
          </section>
        )}

        {view === "disrupted" && (
          <section className="space-y-8">
            <p className="text-alert">{disruption.headline}</p>

            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold sm:text-2xl">{assignment.route}</h2>
                <p className="text-lg">{assignment.cost}</p>
              </div>
              <Meta>{assignment.reason}</Meta>
            </div>

            <Group>
              <Label>Posted at {disruption.posted}</Label>
              <p className="mt-1">
                {savedTrip.from} to {savedTrip.to}, arriving {assignment.arrival}
              </p>
            </Group>

            {accepted ? (
              <p className="text-confirm">
                Got it — you are on Old Baneshwor. Your trip has started.
              </p>
            ) : null}

            <div className="space-y-4 pt-6">
              <PrimaryButton onClick={() => setAccepted(true)}>Got it</PrimaryButton>
              <div>
                <TextLink to="/alternatives">Show other options</TextLink>
              </div>
              {accepted ? (
                <div>
                  <TextLink to="/trip">Open trip</TextLink>
                </div>
              ) : null}
            </div>
          </section>
        )}

        <nav className="space-y-2 border-t border-border pt-6">
          <p className="text-base text-muted">Other states, for review</p>
          <div className="flex flex-col gap-1">
            {(
              [
                ["disrupted", "Disrupted route"],
                ["normal", "No disruption"],
                ["none-available", "No alternative available"],
                ["loading", "Loading"],
                ["error", "Could not check"],
              ] as [View, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={`min-h-[2.75rem] rounded-md px-2 text-left text-base hover:bg-surface-hover ${
                  view === key ? "bg-surface font-medium" : "text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1 pt-4">
            <TextLink to="/onboarding">Onboarding</TextLink>
            <TextLink to="/trip">Trip in progress</TextLink>
            <TextLink to="/how-it-works">How it works</TextLink>
            <TextLink to="/operator">Operator console</TextLink>
          </div>
        </nav>
      </div>
    </Screen>
  );
}
