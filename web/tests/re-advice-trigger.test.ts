import { test, expect } from "bun:test";
import { shouldSuggestAlternative } from "../src/lib/re-advice-trigger";

const route = { edges: ["a", "b", "c"], seconds: 600 };

test("a closure on the current route triggers even when the detour is slower", () => {
  // The primary real case: a closure appears mid-trip, so any recompute from
  // here has to detour around it and comes back *slower*, not faster. This
  // must still surface -- continuing toward a shut road is the whole point.
  const verdict = shouldSuggestAlternative({
    currentRoute: route,
    doneFraction: 0,
    candidateSeconds: 700,
    shutEdges: new Set(["b"]),
  });
  expect(verdict).not.toBeNull();
  expect(verdict?.blocked).toBe(true);
  expect(verdict?.savedSeconds).toBeLessThan(0);
});

test("a meaningfully faster route with nothing blocked triggers as a shortcut", () => {
  const verdict = shouldSuggestAlternative({
    currentRoute: route,
    doneFraction: 0,
    candidateSeconds: 300,
    shutEdges: new Set(),
  });
  expect(verdict).not.toBeNull();
  expect(verdict?.blocked).toBe(false);
  expect(verdict?.savedSeconds).toBe(300);
});

test("a marginally faster route with nothing blocked does not trigger", () => {
  const verdict = shouldSuggestAlternative({
    currentRoute: route,
    doneFraction: 0,
    candidateSeconds: 590,
    shutEdges: new Set(),
  });
  expect(verdict).toBeNull();
});

test("near the end of a trip, a fractionally large but tiny saving does not trigger", () => {
  // 90% done: remaining baseline is only 60s, so even shaving it to nothing
  // is a 100% fractional saving -- but 60s absolute is noise, not worth
  // interrupting for this close to arrival.
  const verdict = shouldSuggestAlternative({
    currentRoute: route,
    doneFraction: 0.9,
    candidateSeconds: 0,
    shutEdges: new Set(),
  });
  expect(verdict).toBeNull();
});
