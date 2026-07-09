import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useMaplibre } from "../hooks/useMaplibre";
import { TyphoonLayer } from "./";

interface Props {
  selectedIds: string[];
}

export default function MapContainer({ selectedIds = [] }: Props) {
  const { map, loaded } = useMaplibre("map-container");
  const lastFit = useRef<string>("");

  // 当选中列表变化时，fitBounds 到所有台风路径
  useEffect(() => {
    if (!map || !loaded || selectedIds.length === 0) return;
    const key = selectedIds.join(",");
    if (key === lastFit.current) return;
    lastFit.current = key;

    // 需要等所有数据的 bounds —— 用 Promise.all 拉
    Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/typhoon/${id}`)
          .then((r) => r.json())
          .catch(() => null),
      ),
    ).then((results) => {
      if (!map) return;
      const bounds = new maplibregl.LngLatBounds();
      let hasPoint = false;
      for (const data of results) {
        if (!data?.points) continue;
        for (const p of data.points) {
          if (p.lng && p.lat) {
            bounds.extend([Number(p.lng), Number(p.lat)]);
            hasPoint = true;
          }
        }
      }
      if (hasPoint) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 600 });
      }
    });
  }, [map, loaded, selectedIds]);

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
      {(selectedIds ?? []).map((id) => (
        <TyphoonLayer key={id} id={id} map={map} ready={loaded} />
      ))}
    </div>
  );
}
