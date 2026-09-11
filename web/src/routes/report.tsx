import { createFileRoute, Link } from "@tanstack/react-router";
import { CarFront, CloudRain, Ban, TrafficCone } from "lucide-react";
import { useState } from "react";

import { Screen } from "@/components/mod/ui";
import { usePosition } from "@/hooks/use-position";
import { postReport, type Report as ReportRow } from "@/lib/api";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a problem — MOD" },
      {
        name: "description",
        content: "Tell MOD what you can see on the road, in one tap.",
      },
    ],
  }),
  component: Report,
});

const KINDS = [
  { id: "jam", label: "Heavy jam", icon: TrafficCone },
  { id: "flood", label: "Flooding", icon: CloudRain },
  { id: "closed", label: "Road closed", icon: Ban },
  { id: "accident", label: "Accident", icon: CarFront },
] as const;

function Report() {
  const position = usePosition(false);
  const [sent, setSent] = useState<ReportRow["kind"] | null>(null);
  const [failed, setFailed] = useState(false);

  const here = position.point;

  async function send(kind: ReportRow["kind"]) {
    if (!here) {
      position.ask();
      return;
    }
    setFailed(false);
    try {
      await postReport(kind, here);
      setSent(kind);
    } catch {
      setFailed(true);
    }
  }

  return (
    <Screen>
      <div className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">What do you see?</h1>
          <p className="text-base text-muted">
            {here
              ? "Your position is sent with the report. Nothing else is."
              : "MOD needs your position so the report means something."}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          {KINDS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => send(id)}
              className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-[6px] p-4 text-base ${
                sent === id
                  ? "bg-foreground text-inverse"
                  : "bg-surface text-foreground hover:bg-surface-hover"
              }`}
            >
              <Icon size={26} strokeWidth={1.8} aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {sent && (
          <p className="text-base text-confirm">
            Reported. Thank you — that is the only thing MOD knows about this road right now.
          </p>
        )}

        {failed && (
          <p className="text-base text-alert">
            That did not send. Your trip is unaffected; try again in a moment.
          </p>
        )}

        {!here && position.status === "denied" && (
          <p className="text-base text-muted">
            Location is blocked, so a report cannot be placed on the map. Allow it in your browser
            settings.
          </p>
        )}

        <Link to="/trip" className="inline-block text-base underline underline-offset-4">
          Back to trip
        </Link>
      </div>
    </Screen>
  );
}
