import "maplibre-gl/dist/maplibre-gl.css";

import { LngLatBounds, Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

// Tiles come straight from the browser to OpenFreeMap. No key, no account, and
// nothing to do with the routing API: the map draws with the backend down, it
// just has no line on it. Swapping provider is this one line.
const STYLE = "https://tiles.openfreemap.org/styles/positron";

const CORRIDOR: [number, number] = [85.33, 27.69];

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
  const drawn = useRef<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!holder.current || map.current) return;
    const m = new MapLibreMap({
      container: holder.current,
      style: STYLE,
      center: CORRIDOR,
      zoom: 12,
      attributionControl: { compact: true },
      // A traveller reading this is moving. Tilting and spinning the map is one
      // more thing to operate at a moment when they have no attention spare.
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: false,
    });

    // Only the style failing is worth hiding the map for. MapLibre reports a
    // missing sprite or a single dropped tile through the same channel, and
    // treating those as fatal blanked a map that was otherwise fine.
    m.on("error", (e) => console.warn("map:", e.error?.message ?? e));
    m.on("load", () => setReady(true));

    // The container is sized by CSS after mount, so the map is frequently
    // created against a box of zero width. Without this it renders one grey
    // rectangle and never recovers.
    const resize = new ResizeObserver(() => m.resize());
    resize.observe(holder.current);

    map.current = m;
    return () => {
      resize.disconnect();
      m.remove();
      map.current = null;
      drawn.current = [];
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;

    for (const id of drawn.current) {
      if (m.getLayer(id)) m.removeLayer(id);
      if (m.getSource(id)) m.removeSource(id);
    }
    drawn.current = [];

    routes.forEach((route, i) => {
      if (route.geometry.length < 2) return;
      const id = `route-${i}`;
      m.addSource(id, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: route.geometry },
        },
      });
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
      drawn.current.push(id);
    });

    const points = routes.flatMap((r) => r.geometry);
    if (points.length > 1) {
      const bounds = points.reduce((b, p) => b.extend(p), new LngLatBounds(points[0]!, points[0]!));
      m.fitBounds(bounds, { padding: 36, duration: 0 });
    }
  }, [routes, ready]);

  return (
    <div
      ref={holder}
      role="img"
      aria-label={label}
      className="w-full overflow-hidden rounded-[6px] border border-border bg-surface"
      style={{ height }}
    />
  );
}
