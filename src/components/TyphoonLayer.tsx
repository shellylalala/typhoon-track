import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";
import { useTyphoonData } from "../hooks/useTyphoonData";
import { pointsToLineGeoJSON, pointsToNodesGeoJSON } from "../lib/geo";

interface Props {
  id: string;
  map: maplibregl.Map | null;
  ready: boolean;
}

const TyphoonLayer = ({ id, map, ready }: Props) => {
  const { data } = useTyphoonData(id);
  const added = useRef(false);

  useEffect(() => {
    if (!map || !ready || !data) return;

    // 切台风时清旧图层
    if (added.current) {
      try {
        map.removeLayer(`${id}-line`);
      } catch {
        console.warn(`Failed to remove layer ${id}-line`);
      }
      try {
        map.removeSource(`${id}-line`);
      } catch {
        console.warn(`Failed to remove source ${id}-line`);
      }
      try {
        map.removeLayer(`${id}-nodes`);
      } catch {
        console.warn(`Failed to remove layer ${id}-nodes`);
      }
      try {
        map.removeSource(`${id}-nodes`);
      } catch {
        console.warn(`Failed to remove source ${id}-nodes`);
      }
    }

    const lineData = pointsToLineGeoJSON(data.points);
    const nodeData = pointsToNodesGeoJSON(data.points);

    map.addSource(`${id}-line`, { type: "geojson", data: lineData });
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
    map.addSource(`${id}-nodes`, { type: "geojson", data: nodeData });
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

    added.current = true;

    return () => {
      try {
        map.removeLayer(`${id}-line`);
      } catch {
        console.warn(`Failed to remove layer ${id}-line`);
      }
      try {
        map.removeSource(`${id}-line`);
      } catch {
        console.warn(`Failed to remove source ${id}-line`);
      }
      try {
        map.removeLayer(`${id}-nodes`);
      } catch {
        console.warn(`Failed to remove layer ${id}-nodes`);
      }
      try {
        map.removeSource(`${id}-nodes`);
      } catch {
        console.warn(`Failed to remove source ${id}-nodes`);
      }
      added.current = false;
    };
  }, [map, ready, data, id]);

  return null;
};

export default TyphoonLayer;
