import "maplibre-gl/dist/maplibre-gl.css";

import { LngLatBounds, Map as MapLibreMap, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Crosshair, Maximize, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { FeatureCollection } from "geojson";
import type { usePosition } from "@/hooks/use-position";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const CORRIDOR: [number, number] = [85.33, 27.69];

// Vite must bundle the worker's imports, not just copy its entry into the build.
setWorkerUrl(workerUrl);

export type MapRoute = {
  geometry: [number, number][];
  tone: "assigned" | "other" | "closed";
};

const TONE = {
  assigned: { color: "#171717", width: 6 },
  other: { color: "#a3a3a3", width: 4 },
  closed: { color: "#8a6d1f", width: 5 },
};

export function MapScreen({
  routes,
  label,
  children,
  position,
  completed = 0,
}: {
  routes: MapRoute[];
  label: string;
  children: ReactNode;
  position: ReturnType<typeof usePosition>;
  completed?: number;
}) {
  return (
    <main className="map-screen">
      <RouteMap
        routes={routes}
        label={label}
        fullscreen
        position={position}
        completed={completed}
      />
      <div className="map-panel">{children}</div>
    </main>
  );
}

export function RouteMap({
  routes,
  height = 220,
  label,
  fullscreen = false,
  position,
  completed = 0,
}: {
  routes: MapRoute[];
  height?: number;
  label: string;
  fullscreen?: boolean;
  position?: ReturnType<typeof usePosition>;
  completed?: number;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const locate = useRef(false);
  const drawn = useRef<string[]>([]);
  const fit = useRef(() => {});
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("Loading map…");

  useEffect(() => {
    if (!holder.current) return;
    let m: MapLibreMap;
    try {
      m = new MapLibreMap({
        container: holder.current,
        style: STYLE,
        center: CORRIDOR,
        zoom: 13,
        minZoom: 7,
        maxBounds: [
          [80, 26],
          [89, 31],
        ],
        attributionControl: { compact: true },
        pitchWithRotate: false,
        dragRotate: false,
      });
    } catch {
      setNotice("Map unavailable. You can still use the route details.");
      return;
    }
    m.touchZoomRotate.disableRotation();
    const timeout = window.setTimeout(
      () => setNotice("Map is taking longer to load. Route details are still available."),
      12000,
    );
    m.on("error", () => {
      if (!m.isStyleLoaded()) setNotice("Map unavailable. You can still use the route details.");
    });
    m.on("load", () => {
      window.clearTimeout(timeout);
      setNotice("");
      setReady(true);
    });
    const resize = new ResizeObserver(() => {
      m.resize();
      fit.current();
    });
    resize.observe(holder.current);
    const panel = holder.current.closest(".map-screen")?.querySelector(".map-panel");
    if (panel) resize.observe(panel);
    map.current = m;
    return () => {
      window.clearTimeout(timeout);
      resize.disconnect();
      m.remove();
      map.current = null;
      drawn.current = [];
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    for (const id of drawn.current) if (m.getLayer(id)) m.removeLayer(id);
    for (const id of drawn.current) if (m.getSource(id)) m.removeSource(id);
    drawn.current = [];

    // Draw alternatives first so shared road segments never cover the selected route.
    [...routes]
      .sort((a, b) => Number(a.tone === "assigned") - Number(b.tone === "assigned"))
      .forEach((route, i) => {
        if (route.geometry.length < 2) return;
        const id = `route-${i}`;
        m.addSource(id, {
          type: "geojson",
          lineMetrics: true,
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
          paint: { "line-color": TONE[route.tone].color, "line-width": TONE[route.tone].width },
        });
        drawn.current.push(id);
      });
    const selected = routes.find((r) => r.tone === "assigned");
    if (selected && selected.geometry.length > 1) {
      m.addSource("endpoints", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [selected.geometry[0]!, selected.geometry.at(-1)!].map((coordinates, i) => ({
            type: "Feature",
            properties: { label: i === 0 ? "A" : "B" },
            geometry: { type: "Point", coordinates },
          })),
        },
      });
      m.addLayer({
        id: "endpoints",
        type: "circle",
        source: "endpoints",
        paint: {
          "circle-radius": 13,
          "circle-color": "#171717",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        },
      });
      m.addLayer({
        id: "endpoint-labels",
        type: "symbol",
        source: "endpoints",
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#ffffff" },
      });
      drawn.current.push("endpoints", "endpoint-labels");
    }
    fit.current = () => {
      const points = routes.flatMap((r) => r.geometry);
      if (points.length < 2) return;
      const panel = holder.current?.closest(".map-screen")?.querySelector(".map-panel");
      const desktop = window.innerWidth >= 768;
      const padding =
        fullscreen && panel
          ? {
              top: desktop ? 64 : 32,
              bottom: 64,
              left: desktop ? panel.getBoundingClientRect().width + 64 : 32,
              right: 88,
            }
          : 36;
      m.fitBounds(
        points.reduce((b, p) => b.extend(p), new LngLatBounds(points[0]!, points[0]!)),
        { padding, duration: 0, maxZoom: 15 },
      );
    };
    fit.current();
  }, [routes, ready, fullscreen]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const selectedIndex = [...routes]
      .sort((a, b) => Number(a.tone === "assigned") - Number(b.tone === "assigned"))
      .findIndex((r) => r.tone === "assigned");
    const id = `route-${selectedIndex}`;
    if (m.getLayer(id))
      m.setPaintProperty(
        id,
        "line-gradient",
        completed <= 0
          ? ["literal", "#171717"]
          : completed >= 1
            ? ["literal", "#a3a3a3"]
            : ["step", ["line-progress"], "#a3a3a3", completed, "#171717"],
      );
  }, [completed, ready, routes]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const point = position?.point;
    const data: FeatureCollection = {
      type: "FeatureCollection",
      features: point
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [point.lon, point.lat] },
            },
          ]
        : [],
    };
    const source = m.getSource<GeoJSONSource>("my-location");
    if (source) source.setData(data);
    else {
      m.addSource("my-location", { type: "geojson", data });
      m.addLayer({
        id: "my-location",
        type: "circle",
        source: "my-location",
        paint: {
          "circle-radius": 8,
          "circle-color": "#2563eb",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        },
      });
    }
    m.moveLayer("my-location");
    if (point && locate.current) {
      m.jumpTo({ center: [point.lon, point.lat], zoom: 15 });
      locate.current = false;
    }
  }, [position?.point, ready, routes]);

  return (
    <section
      className={fullscreen ? "route-map route-map-full" : "route-map"}
      aria-label={label}
      style={fullscreen ? undefined : { height }}
    >
      <div ref={holder} className="map-canvas" />
      {position?.error && (
        <p className="map-location-error" role="status">
          Location unavailable. Allow location access to show your position.
        </p>
      )}
      {notice && (
        <p className="map-notice" role="status">
          {notice}
        </p>
      )}
      <div className="map-controls" aria-label="Map controls">
        <button
          aria-label="Zoom in"
          disabled={!ready}
          onClick={() => map.current?.zoomIn({ duration: 0 })}
        >
          <Plus size={20} />
        </button>
        <button
          aria-label="Zoom out"
          disabled={!ready}
          onClick={() => map.current?.zoomOut({ duration: 0 })}
        >
          <Minus size={20} />
        </button>
        {position && (
          <button
            aria-label="Show my location"
            disabled={!ready || position.status === "asking"}
            onClick={() => {
              locate.current = true;
              position.ask();
            }}
          >
            <Crosshair size={20} />
          </button>
        )}
        <button aria-label="Fit route" disabled={!ready} onClick={() => fit.current()}>
          <Maximize size={18} />
        </button>
      </div>
    </section>
  );
}
