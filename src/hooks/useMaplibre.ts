import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/** 高德卫星 + 中文注记，作为 MapLibre Style */
const AMAP_SATELLITE_STYLE = {
  version: 8,
  sources: {
    "amap-satellite": {
      type: "raster" as const,
      tiles: [
        "https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
        "https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
        "https://webst03.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
        "https://webst04.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: "&copy; 高德地图",
    },
    "amap-labels": {
      type: "raster" as const,
      tiles: [
        "https://webst01.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}",
        "https://webst02.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}",
        "https://webst03.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}",
        "https://webst04.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}",
      ],
      tileSize: 256,
      maxzoom: 18,
    },
  },
  layers: [
    { id: "satellite", type: "raster" as const, source: "amap-satellite" },
    { id: "labels", type: "raster" as const, source: "amap-labels" },
  ],
};

const INITIAL_CENTER: [number, number] = [125, 20]; // 西太平洋 / 南海
const INITIAL_ZOOM = 5;

export const useMaplibre = (containerId: string) => {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container || mapRef.current) return;

    const instance = new maplibregl.Map({
      container: containerId,
      style: AMAP_SATELLITE_STYLE as maplibregl.StyleSpecification,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      maxZoom: 18,
      minZoom: 3,
      attributionControl: false, // 自定义下方放置，避免和面板重叠
    });

    instance.addControl(new maplibregl.NavigationControl(), "bottom-right");

    // ★ 关键：style 未加载完成前操作 source/layer 会竞态崩溃
    instance.on("load", () => setLoaded(true));

    mapRef.current = instance;
    setMap(instance);

    return () => {
      instance.remove();
      mapRef.current = null;
      setMap(null);
      setLoaded(false);
    };
  }, [containerId]);

  return { map, loaded } as const;
};
