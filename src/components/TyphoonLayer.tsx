import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";
import type { GeoJSON } from "geojson";
import { useTyphoonData } from "../hooks/useTyphoonData";
import {
  pointsToLineGeoJSON,
  pointsToNodesGeoJSON,
  windCircleToGeoJSON,
  forecastsToGeoJSON,
} from "../lib/geo";
import { useTyphoonStore } from "../store/typhoon";

interface Props {
  id: string;
  map: maplibregl.Map | null;
  ready: boolean;
}

export default function TyphoonLayer({ id, map, ready }: Props) {
  const { data } = useTyphoonData(id);
  const playbackTime = useTyphoonStore((s) => s.playbackTime);
  const forecastHidden = useTyphoonStore((s) => s.forecastHidden);
  const setupDone = useRef(false);

  // ── Effect A：data/id 变化时重建全部 source + layer ──
  useEffect(() => {
    if (!map || !ready || !data) return;

    // 旧图层清理
    removeLayers(map, id);
    setupDone.current = false;

    // 实测路径 source + layer
    map.addSource(`${id}-line`, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: `${id}-line`,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": 3,
        "line-opacity": 0.85,
      },
    });
    map.addSource(`${id}-nodes`, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: `${id}-nodes`,
      type: "circle",
      source: `${id}-nodes`,
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": ["get", "radius"],
        "circle-opacity": 0.9,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff",
      },
    });

    // 风圈
    for (let i = data.points.length - 1; i >= 0; i--) {
      const p = data.points[i];
      if (p.r7 || p.r10 || p.r12) {
        const wd = windCircleToGeoJSON(
          Number(p.lng),
          Number(p.lat),
          p.r7,
          p.r10,
          p.r12,
        );
        map.addSource(`${id}-wind`, { type: "geojson", data: wd });
        map.addLayer({
          id: `${id}-wind`,
          type: "fill",
          source: `${id}-wind`,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": [
              "case",
              ["==", ["get", "level"], "7级"],
              0.2,
              ["==", ["get", "level"], "10级"],
              0.25,
              0.3,
            ],
            "fill-outline-color": ["get", "color"],
          },
        });
        break;
      }
    }

    // 预报
    const fcData = forecastsToGeoJSON(data.forecasts);
    map.addSource(`${id}-fc`, { type: "geojson", data: fcData });
    map.addLayer({
      id: `${id}-fc-line`,
      type: "line",
      source: `${id}-fc`,
      filter: ["all", ["==", ["get", "type"], "line"], ["!", ["in", ["get", "agency"], ["literal", []]]]],
      paint: {
        "line-color": ["get", "color"],
        "line-width": 2,
        "line-opacity": 0.7,
        "line-dasharray": [4, 3],
      },
    });
    map.addLayer({
      id: `${id}-fc-node`,
      type: "circle",
      source: `${id}-fc`,
      filter: ["all", ["==", ["get", "type"], "node"], ["!", ["in", ["get", "agency"], ["literal", []]]]],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": 3.5,
        "circle-opacity": 0.8,
      },
    });

    setupDone.current = true;

    return () => {
      removeLayers(map, id);
      setupDone.current = false;
    };
  }, [map, ready, data, id]);

  // ── Effect C：预报机构开关 → 只改 filter，不重建图层 ──
  useEffect(() => {
    if (!map || !ready || !setupDone.current) return;
    const hidden = [...forecastHidden];
    try { map.setFilter(`${id}-fc-line`, ["all", ["==", ["get", "type"], "line"], ["!", ["in", ["get", "agency"], ["literal", hidden]]]]); } catch {}
    try { map.setFilter(`${id}-fc-node`, ["all", ["==", ["get", "type"], "node"], ["!", ["in", ["get", "agency"], ["literal", hidden]]]]); } catch {}
  }, [map, ready, id, forecastHidden]);

  // ── Effect B：playbackTime 变化时只更新实测路径的数据 ──
  useEffect(() => {
    if (!map || !ready || !data || !setupDone.current) return;

    const filtered =
      playbackTime !== null
        ? data.points.filter((p) => p.t && p.t <= playbackTime)
        : data.points;

    const lineSrc = map.getSource(`${id}-line`) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (lineSrc) lineSrc.setData(pointsToLineGeoJSON(filtered) as GeoJSON);

    const nodeSrc = map.getSource(`${id}-nodes`) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (nodeSrc) nodeSrc.setData(pointsToNodesGeoJSON(filtered) as GeoJSON);
  }, [map, ready, data, id, playbackTime]);

  return null;
}

// ─── 辅助函数 ───
function removeLayers(map: maplibregl.Map, id: string) {
  for (const suffix of ["line", "nodes", "wind", "fc-line", "fc-node"]) {
    try {
      map.removeLayer(`${id}-${suffix}`);
    } catch {
      /* may not exist */
    }
  }
  for (const suffix of ["line", "nodes", "wind", "fc"]) {
    try {
      map.removeSource(`${id}-${suffix}`);
    } catch {
      /* may not exist */
    }
  }
}
