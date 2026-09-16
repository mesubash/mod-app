/**
 * Whether a freshly recomputed route is worth interrupting a running trip
 * for. There is no live traffic feed for this corridor -- every estimate is
 * free-flow -- so the only thing that can make a fresh recompute from the
 * traveller's own position differ from the route they were given is the
 * closure set having changed since the trip started.
 */
export function shouldSuggestAlternative(input: {
  /** The route the traveller is currently following. */
  currentRoute: { edges: string[]; seconds: number };
  /** Fraction of currentRoute already covered, 0-1. */
  doneFraction: number;
  /** The best route the server would give a fresh request from here now. */
  candidateSeconds: number;
  /** Edges under an active closure right now. */
  shutEdges: ReadonlySet<string>;
}): { savedSeconds: number; blocked: boolean } | null {
  const MIN_SAVED_SECONDS = 180;
  const MIN_SAVED_FRACTION = 0.15;

  const blocked = input.currentRoute.edges.some((e) => input.shutEdges.has(e));
  const remaining = input.currentRoute.seconds * (1 - input.doneFraction);
  const savedSeconds = remaining - input.candidateSeconds;
  const meaningfullyFaster =
    savedSeconds >= MIN_SAVED_SECONDS &&
    savedSeconds / Math.max(remaining, 1) >= MIN_SAVED_FRACTION;

  if (!blocked && !meaningfullyFaster) return null;
  return { savedSeconds, blocked };
}
