import { createFileRoute } from "@tanstack/react-router";
import { Screen, PageTitle, TextLink, BackLink } from "@/components/mod/ui";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How MOD decides your route" },
      {
        name: "description",
        content:
          "Why different travellers on the same closed road are sent different ways, and why some routes are longer.",
      },
      { property: "og:title", content: "How MOD decides your route" },
      {
        property: "og:description",
        content:
          "Why different travellers on the same closed road are sent different ways, and why some routes are longer.",
      },
    ],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <Screen>
      <div className="max-w-[80ch] space-y-8">
        <BackLink to="/">Back to your route</BackLink>
        <PageTitle>How it works</PageTitle>

        <div className="space-y-6 text-lg">
          <p>
            MOD <span className="deva">मोड</span> watches the roads on the trip you saved. When one
            of them closes or slows badly, it tells you, and it tells you which way to go.
          </p>
          <p>
            The part that matters is that it does not tell everyone the same thing. If
            Tinkune–Koteshwor closes and every traveller is pointed at Sinamangal, the jam simply
            moves to Sinamangal. So the diversion is split: you get Old Baneshwor, the person behind
            you gets Sinamangal, someone else gets Thapathali.
          </p>
          <p>
            That means your route is sometimes longer than the shortest one available. We say so on
            the screen, in minutes, before you agree to it. If the shortest way were still open and
            uncrowded, we would have no reason to send you anywhere else.
          </p>
          <p>
            Once you are moving, MOD keeps watching the roads ahead. If something materially better
            appears — a flood clears, a lane reopens — it offers the change once, with the time it
            saves, and you decide. It will not keep changing its mind while you ride.
          </p>
          <p>
            MOD is not a navigation app. The trip screen shows the next turn on your route, worked
            out from the shape of the road alone, but its job is to tell you what is wrong ahead,
            which alternative is yours, and why.
          </p>
          <p>
            Times are free-flow estimates: how long the route takes with the roads clear. MOD has no
            live traffic feed for this corridor yet and does not pretend to.
          </p>
          <p className="text-base text-muted">
            Road data ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              className="underline underline-offset-4"
            >
              OpenStreetMap contributors
            </a>
            , available under the Open Database Licence.
          </p>
        </div>

        <div className="border-t border-border pt-6">
          <TextLink to="/">Back to your route</TextLink>
        </div>
      </div>
    </Screen>
  );
}
