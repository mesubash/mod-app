import { test, expect } from "bun:test";
import { nextManeuver } from "../src/lib/directions";
import type { RouteOption } from "../src/lib/api";

const base: RouteOption = { edges: [], seconds: 0, metres: 0, geometry: [] };

test("a right-angle bend ahead is reported as a left turn, at distance", () => {
  const route: RouteOption = {
    ...base,
    geometry: [
      [85.31, 27.69],
      [85.311, 27.69], // heading due east
      [85.311, 27.691], // heading due north -- facing east, north is to your left
    ],
  };
  const m = nextManeuver(route, { lon: 85.3105, lat: 27.69 });
  expect(m?.turn).toBe("left");
  expect(m?.distanceMetres).toBeGreaterThan(0);
});

test("a near-reversal is classified as a u-turn, not a sharp turn", () => {
  const route: RouteOption = {
    ...base,
    geometry: [
      [85.31, 27.69],
      [85.311, 27.69], // heading east
      [85.309, 27.69], // heading back west
    ],
  };
  const m = nextManeuver(route, { lon: 85.3105, lat: 27.69 });
  expect(m?.turn).toBe("u-turn");
});

test("a straight road ahead has no maneuver", () => {
  const route: RouteOption = {
    ...base,
    geometry: [
      [85.31, 27.69],
      [85.311, 27.69],
      [85.312, 27.69],
    ],
  };
  expect(nextManeuver(route, { lon: 85.3, lat: 27.69 })).toBeNull();
});

test("degenerate geometry has no maneuver", () => {
  expect(nextManeuver(base, { lon: 85.31, lat: 27.69 })).toBeNull();
});
