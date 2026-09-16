import { distance, type Point, type RouteOption } from "./api";

/** Project GPS onto the road segments, then measure distance along the route. */
export function routeProgress(route: RouteOption, here: Point) {
  let total = 0;
  let covered = 0;
  let offRouteBy = Infinity;
  const longitudeScale = Math.cos((here.lat * Math.PI) / 180);
  // ponytail: nearest segment is ambiguous at loops; use heading/history if looped routes are introduced.
  for (let i = 1; i < route.geometry.length; i++) {
    const [ax, ay] = route.geometry[i - 1]!;
    const [bx, by] = route.geometry[i]!;
    const dx = (bx - ax) * longitudeScale;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const fraction =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((here.lon - ax) * longitudeScale * dx + (here.lat - ay) * dy) / lengthSquared,
            ),
          );
    const length = distance({ lon: ax, lat: ay }, { lon: bx, lat: by });
    const away = distance(here, { lon: ax + (bx - ax) * fraction, lat: ay + (by - ay) * fraction });
    if (away < offRouteBy) {
      offRouteBy = away;
      covered = total + length * fraction;
    }
    total += length;
  }
  return { done: total ? covered / total : 0, offRouteBy };
}
