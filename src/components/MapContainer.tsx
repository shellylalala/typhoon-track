import { useMaplibre } from "../hooks/useMaplibre";

const MapContainer = () => {
  const { loaded } = useMaplibre("map-container");

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
};

export default MapContainer;
