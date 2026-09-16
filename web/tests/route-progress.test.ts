import { test, expect } from "bun:test";
import { routeProgress } from "../src/lib/route-progress";
import type { RouteOption } from "../src/lib/api";

test("progress measures road distance, clamps endpoints, and handles degenerate routes", () => {
  const route: RouteOption = {
    edges: [],
    seconds: 0,
    metres: 0,
    geometry: [
      [85.31, 27.69],
      [85.311, 27.69],
      [85.32, 27.69],
    ],
  };
  expect(routeProgress(route, { lon: 85.315, lat: 27.69 }).done).toBeCloseTo(0.5, 2);
  expect(routeProgress(route, { lon: 85.3, lat: 27.69 }).done).toBe(0);
  expect(routeProgress(route, { lon: 85.33, lat: 27.69 }).done).toBe(1);
  expect(routeProgress(route, { lon: 85.315, lat: 27.7 }).offRouteBy).toBeGreaterThan(120);
  expect(routeProgress({ ...route, geometry: [] }, { lon: 85.31, lat: 27.69 }).done).toBe(0);
  expect(
    routeProgress(
      {
        ...route,
        geometry: [
          [85.31, 27.69],
          [85.31, 27.69],
        ],
      },
      { lon: 85.31, lat: 27.69 },
    ).done,
  ).toBe(0);
});
