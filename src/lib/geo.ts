import type { TrackPoint, AgencyForecast, Quad } from "../types/typhoon";
import type { FeatureCollection, Feature } from "geojson";

/**
 * 台风强度对应的映射
 */
interface IntensityConfig {
  max: number;
  label: string;
  color: string;
}

const intensityConfigs: IntensityConfig[] = [
  {
    max: 7,
    label: "热带低压",
    color: "#56B4E9",
  },
  {
    max: 9,
    label: "热带风暴",
    color: "#009E73",
  },
  {
    max: 11,
    label: "强热带风暴",
    color: "#F0E442",
  },
  {
    max: 13,
    label: "台风",
    color: "#E69F00",
  },
  {
    max: 16,
    label: "强台风",
    color: "#D55E00",
  },
  {
    max: Infinity,
    label: "超强台风",
    color: "#CC79A7",
  },
];

const getIntensity = (power: number | null): IntensityConfig => {
  if (power === null) {
    return {
      label: "未知",
      color: "#aaaaaa",
      max: -1,
    };
  }

  return (
    intensityConfigs.find((item) => power <= item.max) ?? {
      label: "未知",
      color: "#aaaaaa",
      max: -1,
    }
  );
};

export const getIntensityColor = (power: number | null): string => {
  return getIntensity(power).color;
};

export const getIntensityLabel = (power: number | null): string => {
  return getIntensity(power).label;
};

/** 路径 → GeoJSON LineString */
export const pointsToLineGeoJSON = (
  points: TrackPoint[],
): FeatureCollection => {
  const valid = points.filter((p) => p.lng !== null && p.lat !== null);
  if (valid.length < 2) return { type: "FeatureCollection", features: [] };

  // 线段分段着色：相邻两点间为一段，颜色取两点的平均 power
  const segments: Feature[] = [];
  for (let i = 1; i < valid.length; i++) {
    const a = valid[i - 1];
    const b = valid[i];
    const avgPower =
      a.power != null && b.power != null
        ? (a.power + b.power) / 2
        : (a.power ?? b.power);
    segments.push({
      type: "Feature",
      properties: {
        color: getIntensityColor(avgPower),
        fromPower: a.power,
        toPower: b.power,
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [a.lng, a.lat],
          [b.lng, b.lat],
        ],
      },
    });
  }

  return {
    type: "FeatureCollection",
    features: segments,
  };
};

// ─── 节点 → GeoJSON Point（大小映射风速） ───
export const pointsToNodesGeoJSON = (
  points: TrackPoint[],
): FeatureCollection => {
  const features: Feature[] = points
    .filter((p) => p.lng != null && p.lat != null)
    .map((p) => ({
      type: "Feature" as const,
      properties: {
        color: getIntensityColor(p.power),
        power: p.power,
        speed: p.speed,
        pressure: p.pressure,
        time: p.time,
        strong: p.strong,
        radius: Math.max(3, Math.min(12, (p.speed || 18) / 5)),
      },
      geometry: {
        type: "Point" as const,
        coordinates: [p.lng, p.lat],
      },
    }));

  return { type: "FeatureCollection", features };
};

// ─── 常量 ───
const KM_PER_DEG_LAT = 111.32;
const ARC_SEGMENTS = 24; // 每个象限的弧线段数

const kmToDegLat = (km: number): number => {
  return km / KM_PER_DEG_LAT;
};
const kmToDegLng = (km: number, lat: number): number => {
  return km / (KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
};

/**
 * 生成一个风圈象限的弧线坐标点
 * @param lng 中心经度
 * @param lat 中心纬度
 * @param radiusKm 该象限半径 km
 * @param startDeg 起始角度（正北=0，顺时针）
 * @param endDeg 结束角度
 */
const quadrantArc = (
  lng: number,
  lat: number,
  radiusKm: number,
  startDeg: number,
  endDeg: number,
): [number, number][] => {
  const points: [number, number][] = [[lng, lat]]; // 从中心出发
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const deg = startDeg + (i / ARC_SEGMENTS) * (endDeg - startDeg);
    const rad = (deg * Math.PI) / 180;
    const dLat = kmToDegLat(radiusKm) * Math.cos(rad);
    const dLng = kmToDegLng(radiusKm, lat) * Math.sin(rad);
    points.push([lng + dLng, lat + dLat]);
  }
  points.push([lng, lat]); // 回到中心闭合
  return points;
};

/**
 * 风圈 → GeoJSON Polygon（4 象限不同半径合并成一个多边形轮廓）
 */
export const windCircleToGeoJSON = (
  lng: number,
  lat: number,
  r7: Quad | null,
  r10: Quad | null,
  r12: Quad | null,
): GeoJSON.FeatureCollection => {
  const features: GeoJSON.Feature[] = [];

  const levels = [
    { label: "7级", radii: r7, color: "#FFD700", opacity: 0.25 },
    { label: "10级", radii: r10, color: "#FF8C00", opacity: 0.3 },
    { label: "12级", radii: r12, color: "#DC143C", opacity: 0.35 },
  ];

  for (const level of levels) {
    if (!level.radii) continue;
    const [ne, se, sw, nw] = level.radii;
    // 四个象限：NE(0-90°) SE(90-180°) SW(180-270°) NW(270-360°)

    const ringNE = quadrantArc(lng, lat, ne, 0, 90);
    const ringSE = quadrantArc(lng, lat, se, 90, 180);
    const ringSW = quadrantArc(lng, lat, sw, 180, 270);
    const ringNW = quadrantArc(lng, lat, nw, 270, 360);

    // 合并为一个多边形环：NE弧 → SE弧 → SW弧 → NW弧（去除每段的首尾中心点）
    const ring: [number, number][] = [];
    // NE: 保留弧线部分（去掉首尾的中心点）
    ring.push(...ringNE.slice(1, -1));
    ring.push(...ringSE.slice(1, -1));
    ring.push(...ringSW.slice(1, -1));
    ring.push(...ringNW.slice(1, -1));
    ring.push(ringNE[1]); // 闭合

    features.push({
      type: "Feature",
      properties: { level: level.label, color: level.color },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  }

  return { type: "FeatureCollection", features };
};

// ─── 预报机构配色 ───
const AGENCY_COLORS: Record<string, string> = {
  中国: "#E31A1C",
  日本: "#1F78B4",
  美国: "#33A02C",
  中国台湾: "#FF7F00",
  中国香港: "#6A3D9A",
};

export const getAgencyColor = (agency: string): string => {
  return AGENCY_COLORS[agency] ?? "#999999";
};

/** 预报路径 → GeoJSON LineString（虚线用 line-dasharray 实现，这里只传数据） */
export const forecastsToGeoJSON = (
  forecasts: AgencyForecast[],
): GeoJSON.FeatureCollection => {
  const features: GeoJSON.Feature[] = [];

  for (const fc of forecasts) {
    const valid = fc.points.filter((p) => p.lng != null && p.lat != null);
    if (valid.length < 2) continue;

    // 整条预报线
    features.push({
      type: "Feature",
      properties: {
        agency: fc.agency,
        color: getAgencyColor(fc.agency),
        type: "line",
      },
      geometry: {
        type: "LineString",
        coordinates: valid.map((p) => [p.lng, p.lat] as [number, number]),
      },
    });

    // 预报点节点
    features.push({
      type: "Feature",
      properties: {
        agency: fc.agency,
        color: getAgencyColor(fc.agency),
        type: "node",
      },
      geometry: {
        type: "MultiPoint",
        coordinates: valid.map((p) => [p.lng, p.lat] as [number, number]),
      },
    });
  }

  return { type: "FeatureCollection", features };
};

// ─── 回放：按时间截断 points ───
export const filterPointsByTime = (
  points: Array<{ t: number }>,
  cutoff: number | null,
): typeof points => {
  if (cutoff === null) return points;
  return points.filter((p) => p.t <= cutoff);
};
