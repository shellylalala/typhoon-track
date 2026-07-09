import { useEffect, useRef } from "react";
import { useMaplibre } from "../hooks/useMaplibre";
import { TyphoonLayer } from "./";

interface Props {
  selectedIds: string[];
  activeTabId: string | null;
}
export default function MapContainer({ selectedIds = [], activeTabId }: Props) {
  const { map, loaded } = useMaplibre("map-container");

  // 当选中列表变化时，fitBounds 到所有台风路径
  const lastCenter = useRef<string>("");

  useEffect(() => {
    if (!map || !loaded) return;
    const targetId =
      activeTabId && selectedIds.includes(activeTabId)
        ? activeTabId
        : selectedIds[0];
    if (!targetId || targetId === lastCenter.current) return;
    lastCenter.current = targetId;

    fetch(`/api/typhoon/${targetId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!map || !data?.points?.length) return;
        for (let i = data.points.length - 1; i >= 0; i--) {
          const p = data.points[i];
          if (p.lng && p.lat) {
            map.easeTo({
              center: [Number(p.lng), Number(p.lat)],
              zoom: 5,
              duration: 600,
            });
            return;
          }
        }
      })
      .catch(() => {});
  }, [map, loaded, selectedIds, activeTabId]);

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
