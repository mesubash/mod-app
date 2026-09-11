import { createFileRoute } from "@tanstack/react-router";
import { Screen, PageTitle, Meta, TextLink, BackLink } from "@/components/mod/ui";
import { assignment, savedTrip, tripProgress } from "@/lib/mod-data";

export const Route = createFileRoute("/trip")({
  head: () => ({
    meta: [
      { title: "Trip in progress — MOD" },
      {
        name: "description",
        content:
          "Where you are on the advised route, the next point advice could change, and an honest arrival estimate.",
      },
      { property: "og:title", content: "Trip in progress — MOD" },
      {
        property: "og:description",
        content:
          "Where you are on the advised route, the next point advice could change, and an honest arrival estimate.",
      },
    ],
  }),
  component: Trip,
});

function Trip() {
  return (
    <Screen>
      <div className="space-y-10">
        <BackLink to="/">Back to your route</BackLink>

        <header className="space-y-3">
          <Meta>
            Started {tripProgress.startedAt} · {savedTrip.from} to {savedTrip.to}
          </Meta>
          <PageTitle>{assignment.route}</PageTitle>
        </header>

        <section className="space-y-8">
          <div className="space-y-1">
            <Meta>You are here</Meta>
            <p className="text-xl font-semibold break-words sm:text-2xl">{tripProgress.onRoute}</p>
          </div>

          <div className="space-y-1">
            <Meta>Arriving</Meta>
            <p className="text-xl font-semibold sm:text-2xl">{tripProgress.arrival}</p>
          </div>

          <div className="space-y-1">
            <Meta>Next check</Meta>
            <p className="text-lg break-words">{tripProgress.nextCheck}</p>
          </div>
        </section>

        <div className="space-y-4 border-t border-border pt-6">
          <TextLink to="/report">Report a problem</TextLink>
          <div className="space-y-2">
            <p className="text-base text-muted">Later in this trip</p>
            <div className="flex flex-col gap-1">
              <TextLink to="/re-advice">Route change offered</TextLink>
              <TextLink to="/after-trip">After the trip</TextLink>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}
