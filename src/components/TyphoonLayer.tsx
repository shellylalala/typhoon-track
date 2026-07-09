import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";
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
  const forecastHidden = useTyphoonStore((s) => s.forecastHidden);
  const added = useRef(false);

  useEffect(() => {
    if (!map || !ready || !data) return;

    // 切台风时清旧图层
    if (added.current) removeLayers(map, id);
    added.current = true;

    // ── 实测路径 ──
    addSourceLayer(
      map,
      `${id}-line`,
      {
        type: "geojson",
        data: pointsToLineGeoJSON(data.points),
      },
      {
        id: `${id}-line`,
        type: "line",
        source: `${id}-line`,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 3,
          "line-opacity": 0.85,
        },
      },
    );
    addSourceLayer(
      map,
      `${id}-nodes`,
      {
        type: "geojson",
        data: pointsToNodesGeoJSON(data.points),
      },
      {
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
      },
    );

    // ── 风圈（7/10/12级，取最新实测点） ──
    for (let i = data.points.length - 1; i >= 0; i--) {
      const p = data.points[i];
      if (p.r7 || p.r10 || p.r12) {
        const lng = Number(p.lng),
          lat = Number(p.lat);
        const windData = windCircleToGeoJSON(lng, lat, p.r7, p.r10, p.r12);
        addSourceLayer(
          map,
          `${id}-wind`,
          { type: "geojson", data: windData },
          {
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
          },
        );
        break; // 只画最新有风圈数据的点
      }
    }

    // ── 预报路径 ──
    const fcData = forecastsToGeoJSON(data.forecasts);
    addSourceLayer(
      map,
      `${id}-fc`,
      { type: "geojson", data: fcData },
      {
        id: `${id}-fc-line`,
        type: "line",
        source: `${id}-fc`,
        filter: [
          "all",
          ["==", ["get", "type"], "line"],
          ["!", ["in", ["get", "agency"], ["literal", [...forecastHidden]]]],
        ],
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2,
          "line-opacity": 0.7,
          "line-dasharray": [4, 3],
        },
      },
    );
    addSourceLayer(map, `${id}-fc-node`, null, {
      id: `${id}-fc-node`,
      type: "circle",
      source: `${id}-fc`,
      filter: [
        "all",
        ["==", ["get", "type"], "node"],
        ["!", ["in", ["get", "agency"], ["literal", [...forecastHidden]]]],
      ],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": 3.5,
        "circle-opacity": 0.8,
      },
    });

    return () => {
      removeLayers(map, id);
      added.current = false;
    };
  }, [map, ready, data, id, forecastHidden]);

  return null;
}

// ─── 辅助函数 ───
function addSourceLayer(
  map: maplibregl.Map,
  sourceId: string,
  sourceOpts: maplibregl.GeoJSONSourceSpecification | null,
  layerOpts: maplibregl.LayerSpecification | null,
) {
  if (sourceOpts) {
    try {
      map.addSource(sourceId, sourceOpts);
    } catch {
      /* source may exist */
    }
  }
  if (layerOpts) {
    try {
      map.addLayer(layerOpts);
    } catch {
      /* layer may exist */
    }
  }
}

function removeLayers(map: maplibregl.Map, id: string) {
  for (const suffix of ["line", "nodes", "wind", "fc-line", "fc-node"]) {
    try {
      map.removeLayer(`${id}-${suffix}`);
    } catch {
      /* may not exist */
    }
  }
  for (const suffix of ["line", "nodes", "wind", "fc", "fc-node"]) {
    try {
      map.removeSource(`${id}-${suffix}`);
    } catch {
      /* may not exist */
    }
  }
}
