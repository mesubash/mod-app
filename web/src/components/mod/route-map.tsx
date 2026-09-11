import "maplibre-gl/dist/maplibre-gl.css";

import { GeoJSONSource, LngLatBounds, Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

// OpenFreeMap needs no key and no account. Swapping tile providers is this
// one line; MapLibre takes any style URL.
const STYLE = "https://tiles.openfreemap.org/styles/positron";

export type MapRoute = {
  geometry: [number, number][];
  tone: "assigned" | "other" | "closed";
};

const TONE = {
  assigned: { color: "#171717", width: 5 },
  other: { color: "#a3a3a3", width: 3 },
  closed: { color: "#8a6d1f", width: 5 },
};

export function RouteMap({
  routes,
  height = 220,
  label,
}: {
  routes: MapRoute[];
  height?: number;
  label: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!holder.current || map.current) return;
    const m = new MapLibreMap({
      container: holder.current,
      style: STYLE,
      center: [85.33, 27.69],
      zoom: 12,
      attributionControl: { compact: true },
      // A traveller reading this is moving. Tilting and spinning the map is
      // one more thing to understand at a moment when they have no attention
      // to spare.
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: false,
    });
    m.on("error", () => setFailed(true));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const draw = () => {
      for (const [i, route] of routes.entries()) {
        const id = `route-${i}`;
        const data = {
          type: "Feature" as const,
          properties: {},
          geometry: { type: "LineString" as const, coordinates: route.geometry },
        };
        const existing = m.getSource(id);
        if (existing) {
          (existing as GeoJSONSource).setData(data);
          continue;
        }
        m.addSource(id, { type: "geojson", data });
        m.addLayer({
          id,
          type: "line",
          source: id,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": TONE[route.tone].color,
            "line-width": TONE[route.tone].width,
          },
        });
      }

      const points = routes.flatMap((r) => r.geometry);
      if (points.length > 1) {
        const bounds = points.reduce(
          (b, p) => b.extend(p),
          new LngLatBounds(points[0]!, points[0]!),
        );
        m.fitBounds(bounds, { padding: 36, duration: 0 });
      }
    };

    if (m.isStyleLoaded()) draw();
    else m.once("load", draw);
  }, [routes]);

  if (failed) return null;

  return (
    <div
      ref={holder}
      role="img"
      aria-label={label}
      className="w-full overflow-hidden rounded-[6px] border border-border"
      style={{ height }}
    />
  );
}
