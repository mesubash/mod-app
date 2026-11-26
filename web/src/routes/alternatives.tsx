import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { BackLink, Meta, PageTitle, Screen } from "@/components/mod/ui";
import { usePosition } from "@/hooks/use-position";
import {
  difference,
  fetchRoutes,
  kilometres,
  minutes,
  postAssignment,
  type RouteResponse,
} from "@/lib/api";
import { DEFAULT_DESTINATION, PLACES, tripSearch, viaNames } from "@/lib/places";

export const Route = createFileRoute("/alternatives")({
  head: () => ({
    meta: [
      { title: "Other options — MOD" },
      {
        name: "description",
        content: "Every way through the disruption, with what each one costs.",
      },
    ],
  }),
  validateSearch: tripSearch,
  component: Alternatives,
});

function Alternatives() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const device = search.from === "__device__";
  const position = usePosition(device);
  const origin = device
    ? position.point
    : (PLACES.find((p) => p.name === search.from) ?? PLACES[2]!).point;
  const destination = (PLACES.find((p) => p.name === search.to) ?? DEFAULT_DESTINATION).point;
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    fetchRoutes(origin, destination, search.vehicle)
      .then((r) => !cancelled && setResult(r))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // A moving device position must not refetch the list under the reader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin === null, search.from, search.to, search.vehicle]);

  function take(i: number) {
    if (result?.spread_key) postAssignment(result.spread_key, i).catch(() => {});
    navigate({ to: "/trip", search: { ...search, option: i } });
  }

  const names =
    result && origin
      ? viaNames(
          result.routes.map((r) => r.geometry),
          [origin, destination],
        )
      : [];
  const usual = result?.usual_seconds ?? null;

  return (
    <Screen>
      <div className="space-y-6">
        <BackLink to="/">Back to your route</BackLink>
        <header className="space-y-2">
          <PageTitle>Other options</PageTitle>
          <Meta>
            {search.from === "__device__" ? "From where you are" : search.from} to {search.to}.
            Free-flow estimates, not live traffic.
          </Meta>
        </header>

        {failed && (
          <div className="rounded-[6px] bg-surface p-4">
            <h2 className="text-lg font-medium">The route service did not answer</h2>
            <Meta>Check your connection and go back to try again.</Meta>
          </div>
        )}

        {!failed && !result && (
          <p className="text-base text-muted" role="status">
            {device && !position.point ? "Finding you…" : "Finding routes…"}
          </p>
        )}

        {result && result.routes.length === 0 && (
          <div className="rounded-[6px] bg-surface p-4">
            <h2 className="text-lg font-medium">No alternative available</h2>
            <Meta>
              Nothing gets through from here while the road is shut. The closure notice on the home
              screen says when it is expected to clear.
            </Meta>
          </div>
        )}

        {result && result.routes.length > 0 && (
          <ul className="space-y-2">
            {result.routes.map((r, i) => {
              const taken = result.recent_assignments?.[i] ?? 0;
              return (
                <li key={i} className="rounded-[6px] bg-surface p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-lg font-medium">
                      {names[i] ? `Via ${names[i]}` : `Option ${i + 1}`}
                    </h2>
                    <span className="text-lg font-semibold">{minutes(r.seconds)}</span>
                  </div>
                  <p className="text-base first-letter:uppercase">
                    {usual != null
                      ? difference(r.seconds, usual, "usual")
                      : i === 0
                        ? "Quickest"
                        : difference(r.seconds, result.routes[0]!.seconds, "the quickest")}
                    {" · "}
                    {kilometres(r.metres)}
                  </p>
                  {(i === result.assigned || taken > 0) && (
                    <p className="text-base text-muted">
                      {i === result.assigned && usual != null ? "Your assigned route. " : ""}
                      {taken > 0
                        ? `${taken} ${taken === 1 ? "traveller" : "travellers"} on this trip took it in the last two hours.`
                        : ""}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => take(i)}
                    className="mt-2 inline-flex min-h-11 items-center rounded-[6px] px-1 text-base font-medium underline underline-offset-4 hover:bg-surface-hover"
                  >
                    Take this route
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Screen>
  );
}
