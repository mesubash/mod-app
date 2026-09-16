import { distance, type Point, type RouteOption } from "./api";

export type Turn = "left" | "right" | "sharp-left" | "sharp-right" | "u-turn";

const TURN_THRESHOLD_DEG = 20;
const SHARP_THRESHOLD_DEG = 100;
const U_TURN_THRESHOLD_DEG = 155;

function bearing(a: Point, b: Point): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Signed turn in degrees: positive is right, negative is left, wrapped to [-180, 180]. */
function turnAngle(fromBearing: number, toBearing: number): number {
  let delta = toBearing - fromBearing;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function classify(delta: number): Turn | null {
  const abs = Math.abs(delta);
  if (abs < TURN_THRESHOLD_DEG) return null;
  if (abs >= U_TURN_THRESHOLD_DEG) return "u-turn";
  if (abs >= SHARP_THRESHOLD_DEG) return delta > 0 ? "sharp-right" : "sharp-left";
  return delta > 0 ? "right" : "left";
}

export type Maneuver = { turn: Turn; distanceMetres: number };

/**
 * The next meaningful direction change ahead, purely from route geometry.
 * The corridor graph has no street names (see DATA.md), so this can say
 * "turn right in 150 m," never "onto Ring Road" -- that needs a re-export
 * of the graph carrying OSM name tags, which hasn't happened.
 */
export function nextManeuver(route: RouteOption, here: Point): Maneuver | null {
  const geo = route.geometry;
  if (geo.length < 2) return null;

  const longitudeScale = Math.cos((here.lat * Math.PI) / 180);
  let nearestIndex = 1;
  let nearestDistance = Infinity;
  let distanceToVertex = 0;

  for (let i = 1; i < geo.length; i++) {
    const [ax, ay] = geo[i - 1]!;
    const [bx, by] = geo[i]!;
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
    const onSegment = { lon: ax + (bx - ax) * fraction, lat: ay + (by - ay) * fraction };
    const away = distance(here, onSegment);
    if (away < nearestDistance) {
      nearestDistance = away;
      nearestIndex = i;
      distanceToVertex = distance(onSegment, { lon: bx, lat: by });
    }
  }

  const [sx, sy] = geo[nearestIndex - 1]!;
  const [ex, ey] = geo[nearestIndex]!;
  const currentBearing = bearing({ lon: sx, lat: sy }, { lon: ex, lat: ey });

  for (let i = nearestIndex; i < geo.length - 1; i++) {
    const [ax, ay] = geo[i]!;
    const [bx, by] = geo[i + 1]!;
    const turn = classify(
      turnAngle(currentBearing, bearing({ lon: ax, lat: ay }, { lon: bx, lat: by })),
    );
    if (turn) return { turn, distanceMetres: Math.round(distanceToVertex) };
    distanceToVertex += distance({ lon: ax, lat: ay }, { lon: bx, lat: by });
  }
  return null;
}
