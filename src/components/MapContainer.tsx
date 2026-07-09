import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useMaplibre } from "../hooks/useMaplibre";
import { useTyphoonData } from "../hooks/useTyphoonData";
import { pointsToLineGeoJSON, pointsToNodesGeoJSON } from "../lib/geo";

interface Props {
  typhoonId: string | null;
}

export default function MapContainer({ typhoonId }: Props) {
  const { map, loaded } = useMaplibre("map-container");
  const { data } = useTyphoonData(typhoonId ?? "");
  const layersAdded = useRef(false);

  // 当地图就绪 & 数据到达时，添加 GeoJSON 图层
  useEffect(() => {
    if (!map || !loaded || !data) return;

    const id = data.id;

    // 先清除旧图层（切换台风时）
    if (layersAdded.current) {
      try {
        map.removeLayer(`${id}-line`);
      } catch {
        console.error(`Failed to remove layer ${id}-line`);
      }
      try {
        map.removeSource(`${id}-line`);
      } catch {
        console.error(`Failed to remove source ${id}-line`);
      }
      try {
        map.removeLayer(`${id}-nodes`);
      } catch {
        console.error(`Failed to remove layer ${id}-nodes`);
      }
      try {
        map.removeSource(`${id}-nodes`);
      } catch {
        console.error(`Failed to remove source ${id}-nodes`);
      }
    }

    const lineGeojson = pointsToLineGeoJSON(data.points);
    const nodeGeojson = pointsToNodesGeoJSON(data.points);

    // 线段 source + layer
    map.addSource(`${id}-line`, { type: "geojson", data: lineGeojson });
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: `${id}-line`,
      paint: {
        "line-color": ["get", "color"],
        "line-width": 3,
        "line-opacity": 0.85,
      },
    });

    // 节点圆点 source + layer
    map.addSource(`${id}-nodes`, { type: "geojson", data: nodeGeojson });
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

    layersAdded.current = true;

    // 自动聚焦到路径范围
    if (data.points.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      for (const p of data.points) {
        if (p.lng && p.lat) bounds.extend([p.lng, p.lat]);
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 10, duration: 800 });
      }
    }

    return () => {
      try {
        map.removeLayer(`${id}-line`);
      } catch {
        console.error(`Failed to remove layer ${id}-line`);
      }
      try {
        map.removeSource(`${id}-line`);
      } catch {
        console.error(`Failed to remove source ${id}-line`);
      }
      try {
        map.removeLayer(`${id}-nodes`);
      } catch {
        console.error(`Failed to remove layer ${id}-nodes`);
      }
      try {
        map.removeSource(`${id}-nodes`);
      } catch {
        console.error(`Failed to remove source ${id}-nodes`);
      }
      layersAdded.current = false;
    };
  }, [map, loaded, data]);

  return (
    <div
      id="map-container"
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      {!loaded && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#888",
            fontSize: 14,
            zIndex: 10,
          }}
        >
          地图加载中...
        </div>
      )}
    </div>
  );
}
