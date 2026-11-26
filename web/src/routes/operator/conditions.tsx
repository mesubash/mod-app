import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Console } from "@/components/mod/console";
import { getReports, type Report } from "@/lib/api";

export const Route = createFileRoute("/operator/conditions")({
  head: () => ({
    meta: [
      { title: "Reported conditions — MOD operator console" },
      {
        name: "description",
        content: "What travellers are reporting on the corridor right now.",
      },
    ],
  }),
  component: Conditions,
});

const LABEL: Record<Report["kind"], string> = {
  jam: "Heavy jam",
  flood: "Flooding",
  closed: "Road closed",
  accident: "Accident",
};

function ago(created: number): string {
  const mins = Math.round((Date.now() - created * 1000) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} h ago`;
}

function Conditions() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const load = () =>
      getReports(localStorage.getItem("mod.operator.token") ?? "")
        .then(setReports)
        .catch(() => setFailed(true));
    load();
    // Reports are the only live signal there is. A duty officer leaves this
    // open on a desk, so it refreshes rather than waiting to be reloaded.
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Console>
      <h2 className="mb-4 text-lg font-medium">
        Reported conditions <span className="font-normal text-muted">last two hours</span>
      </h2>

      <p className="mb-6 max-w-[60ch] text-base text-muted">
        These come from travellers, one tap each. Until probe collection exists they are the only
        thing the system knows about the roads in real time, so they are unverified by design. The
        console does not decide what to act on.
      </p>

      {failed && (
        <p className="text-base text-muted">
          Could not load reports. Check the operator token on Post a disruption, and that the
          service is running.
        </p>
      )}

      {reports && reports.length === 0 && (
        <p className="text-base text-muted">Nothing reported in the last two hours.</p>
      )}

      {reports && reports.length > 0 && (
        <table className="w-full max-w-[50rem] border-collapse text-base">
          <thead>
            <tr className="border-b border-border text-left text-sm text-muted">
              <th className="py-2 pr-4 font-normal">What</th>
              <th className="py-2 pr-4 font-normal">Where</th>
              <th className="py-2 font-normal">When</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-border">
                <td className="py-2 pr-4">{LABEL[r.kind]}</td>
                <td className="py-2 pr-4 text-muted">
                  {r.lat.toFixed(4)}, {r.lon.toFixed(4)}
                </td>
                <td className="py-2 text-muted">{ago(r.created)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Console>
  );
}
