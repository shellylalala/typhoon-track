import type { TrackPoint } from "../types/typhoon";
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
