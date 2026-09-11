import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Console } from "@/components/mod/console";
import { Meta, PageTitle, PrimaryButton } from "@/components/mod/ui";
import { disruptionKinds, durations, segmentMatches, segments } from "@/lib/mod-data";

export const Route = createFileRoute("/operator/")({
  head: () => ({
    meta: [
      { title: "Post a disruption — MOD operator console" },
      {
        name: "description",
        content:
          "Select the affected segment, the type and the expected duration, then publish it to the travellers on that road.",
      },
      { property: "og:title", content: "Post a disruption — MOD operator console" },
      {
        property: "og:description",
        content:
          "Select the affected segment, the type and the expected duration, then publish it to the travellers on that road.",
      },
    ],
  }),
  component: PostDisruption,
});

const field =
  "min-h-[2.75rem] w-full max-w-[28rem] rounded-md bg-surface px-3 py-3 text-base text-foreground";

type Status = "editing" | "publishing" | "published" | "failed";

function PostDisruption() {
  const [segment, setSegment] = useState("");
  const [kind, setKind] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<Status>("editing");
  const [error, setError] = useState<string | null>(null);

  const matched = segment ? segmentMatches[segment] : undefined;

  if (status === "published") {
    return (
      <Console current="/operator">
        <div className="max-w-[80ch] space-y-6">
          <PageTitle>Disruption published</PageTitle>
          <p className="text-lg">
            {segment} — {kind.toLowerCase()}, {duration.toLowerCase()}. Published at 08:22.
          </p>
          <p className="text-lg">
            {matched} travellers have a saved trip through {segment} at this hour. They are being
            assigned across the alternatives now; no single road takes the whole diversion.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
            <PrimaryButton onClick={() => setStatus("editing")}>Post another</PrimaryButton>
          </div>
        </div>
      </Console>
    );
  }

  return (
    <Console current="/operator">
      <form
        className="max-w-[80ch] space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (!segment || !kind || !duration) {
            setError("Choose a segment, a type and an expected duration before publishing.");
            return;
          }
          setError(null);
          setStatus("publishing");
          window.setTimeout(() => setStatus("published"), 600);
        }}
      >
        <header className="space-y-2">
          <PageTitle>Post a disruption</PageTitle>
          <Meta>
            Travellers with a saved trip through the segment are advised within a minute of
            publishing.
          </Meta>
        </header>

        <div className="space-y-2">
          <label htmlFor="segment" className="block text-lg font-semibold">
            Affected road segment
          </label>
          <select
            id="segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className={field}
          >
            <option value="">Choose a segment</option>
            {segments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Meta>
            {matched === undefined
              ? "No segment chosen yet."
              : `${matched} travellers have a saved trip through ${segment} at this hour.`}
          </Meta>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-lg font-semibold">Type</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {disruptionKinds.map((k) => (
              <label
                key={k}
                className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-md px-1 text-base"
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="size-4 accent-foreground"
                />
                {k}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="duration" className="block text-lg font-semibold">
            Expected duration
          </label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={field}
          >
            <option value="">Choose a duration</option>
            {durations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <Meta>
            Travellers are told this as an estimate. It can be changed while the disruption is live.
          </Meta>
        </div>

        {error ? <p role="alert">{error}</p> : null}

        {status === "failed" ? (
          <p role="alert">
            The disruption did not publish — the console lost its connection at 08:22. Nothing was
            sent to travellers. Publish again when it returns.
          </p>
        ) : null}

        <div className="space-y-4 pt-2">
          <PrimaryButton type="submit" disabled={status === "publishing"}>
            {status === "publishing" ? "Publishing…" : "Publish"}
          </PrimaryButton>
          <div>
            <button
              type="button"
              onClick={() => setStatus("failed")}
              className="min-h-[2.75rem] rounded-md px-1 text-base text-muted underline underline-offset-4 hover:bg-surface-hover"
            >
              Show publish failure state
            </button>
          </div>
        </div>
      </form>
    </Console>
  );
}
