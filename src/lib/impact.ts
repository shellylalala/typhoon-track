// src/lib/impact.ts
// 城市波及倒计时算法

// ─── 城市坐标 ───
export interface City {
  id: string;
  name: string;
  lng: number;
  lat: number;
}

export const CITIES: City[] = [
  { id: "taipei", name: "台北", lng: 121.53, lat: 25.03 },
  { id: "kaohsiung", name: "高雄", lng: 120.3, lat: 22.63 },
  { id: "fuzhou", name: "福州", lng: 119.3, lat: 26.08 },
  { id: "xiamen", name: "厦门", lng: 118.09, lat: 24.48 },
  { id: "wenzhou", name: "温州", lng: 120.7, lat: 28.0 },
  { id: "ningbo", name: "宁波", lng: 121.55, lat: 29.87 },
  { id: "hangzhou", name: "杭州", lng: 120.15, lat: 30.28 },
  { id: "shanghai", name: "上海", lng: 121.47, lat: 31.23 },
  { id: "guangzhou", name: "广州", lng: 113.26, lat: 23.13 },
  { id: "shenzhen", name: "深圳", lng: 114.07, lat: 22.55 },
  { id: "macau", name: "澳门", lng: 113.55, lat: 22.19 },
];
// 更大的城市数据库（用于自动推荐和搜索，50 个）
export const CITY_DB: City[] = [
  ...CITIES,
  { id: "taizhong", name: "台中", lng: 120.68, lat: 24.15 },
  { id: "quanzhou", name: "泉州", lng: 118.59, lat: 24.91 },
  { id: "zhangzhou", name: "漳州", lng: 117.66, lat: 24.51 },
  { id: "hongkong", name: "香港", lng: 114.17, lat: 22.3 },
  { id: "zhuhai", name: "珠海", lng: 113.58, lat: 22.27 },
  { id: "zhanjiang", name: "湛江", lng: 110.36, lat: 21.27 },
  { id: "haikou", name: "海口", lng: 110.33, lat: 20.04 },
  { id: "sanya", name: "三亚", lng: 109.51, lat: 18.25 },
  { id: "nanjing", name: "南京", lng: 118.79, lat: 32.06 },
  { id: "nantong", name: "南通", lng: 120.89, lat: 31.98 },
  { id: "yancheng", name: "盐城", lng: 120.16, lat: 33.35 },
  { id: "qingdao", name: "青岛", lng: 120.38, lat: 36.07 },
  { id: "dalian", name: "大连", lng: 121.61, lat: 38.91 },
  { id: "shantou", name: "汕头", lng: 116.68, lat: 23.35 },
  { id: "beihai", name: "北海", lng: 109.12, lat: 21.48 },
  { id: "lianyungang", name: "连云港", lng: 119.22, lat: 34.6 },
];
// ─── 球面距离 (km) ────
const R = 6371; // 地球半径 km

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistance(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── 点到线段的球面最短距离 ───
function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const toXY = (lng: number, lat: number): [number, number] => {
    const midLat = (((ay + py) / 2) * Math.PI) / 180;
    return [lng * 111.32 * Math.cos(midLat), lat * 111.32];
  };
  const [Px, Py] = toXY(px, py);
  const [Ax, Ay] = toXY(ax, ay);
  const [Bx, By] = toXY(bx, by);
  const dx = Bx - Ax,
    dy = By - Ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineDistance(px, py, ax, ay);
  let t = ((Px - Ax) * dx + (Py - Ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestLng = ax + (bx - ax) * t;
  const closestLat = ay + (by - ay) * t;
  return haversineDistance(px, py, closestLng, closestLat);
}

/** 城市到路径走廊的最短距离 */
function pathCorridorDistance(
  cityLng: number,
  cityLat: number,
  path: Array<{ lng: number; lat: number }>,
): number {
  if (path.length === 0) return Infinity;
  let min = Infinity;
  for (let i = 1; i < path.length; i++) {
    const d = pointToSegmentDistance(
      cityLng,
      cityLat,
      path[i - 1].lng,
      path[i - 1].lat,
      path[i].lng,
      path[i].lat,
    );
    if (d < min) min = d;
  }
  for (const p of path) {
    const d = haversineDistance(cityLng, cityLat, p.lng, p.lat);
    if (d < min) min = d;
  }
  return min;
}

// ─── 路径沿线城市推荐 ───
/** 从城市数据库中找出路径或预报沿线的最近城市（300km 以内，最多 max 个） */
export function findRelevantCities(
  pathPoints: Array<{ lng: number; lat: number }>,
  forecastPoints: Array<{ lng: number; lat: number }>,
  maxCities: number = 15,
): City[] {
  const allPoints = [...pathPoints, ...forecastPoints];
  if (allPoints.length === 0) return CITY_DB.slice(0, maxCities);

  const scored = CITY_DB.map((city) => {
    let minDist = Infinity;
    for (const p of allPoints) {
      const d = haversineDistance(p.lng, p.lat, city.lng, city.lat);
      if (d < minDist) minDist = d;
    }
    return { city, minDist };
  });

  return scored
    .filter((s) => s.minDist < 300)
    .sort((a, b) => a.minDist - b.minDist)
    .slice(0, maxCities)
    .map((s) => s.city);
}
export interface CityImpact {
  city: City;
  /** 距离台风中心最近距离 (km) */
  distanceKm: number;
  /** 预估到达时间 (epoch ms)；null 表示不受影响或无法估算 */
  arrivalTime: number | null;
  /** 状态 */
  level: "affected" | "imminent" | "warning" | "watching" | "none";
  /** 最快可到达时间描述 */
  label: string;
}

export function calculateImpacts(
  cities: City[],
  points: Array<{
    lng: number;
    lat: number;
    t: number;
    speed: number;
    moveSpeed: number | null;
  }>,
  r7: [number, number, number, number] | null,
  forecasts: Array<{ lng: number; lat: number; t: number }>,
  now: number,
): CityImpact[] {
  const latest = points[points.length - 1];
  if (!latest)
    return cities.map((c) => ({
      city: c,
      distanceKm: Infinity,
      arrivalTime: null,
      level: "none" as const,
      label: "无数据",
    }));

  // 历史台风（最新实测点 > 24 小时前）→ 不计算倒计时
  if (latest.t < now - 24 * 3600e3) {
    return cities.map((c) => ({
      city: c,
      distanceKm: haversineDistance(latest.lng, latest.lat, c.lng, c.lat),
      arrivalTime: null,
      level: "none" as const,
      label: "历史台风",
    }));
  }

  // 7 级风圈最大半径（取四象限最大值）
  const maxR7 = r7 ? Math.max(...r7) : 0;

  // 合并实测 + 预报为一条完整路径走廊
  const corridorPoints = [
    ...points.map((p) => ({ lng: p.lng, lat: p.lat })),
    ...forecasts,
  ];
  const CORRIDOR_WIDTH = 200; // km，走廊半宽

  // 查找预报中离每个城市最近的距离和时间
  function forecastInfo(cityLng: number, cityLat: number) {
    let minD = Infinity;
    let t: number | null = null;
    for (const f of forecasts) {
      const d = haversineDistance(f.lng, f.lat, cityLng, cityLat);
      if (d < minD) {
        minD = d;
        t = f.t;
      }
    }
    return { minD, t };
  }

  return cities.map((city) => {
    const dist = haversineDistance(latest.lng, latest.lat, city.lng, city.lat);
    const corridorDist = pathCorridorDistance(
      city.lng,
      city.lat,
      corridorPoints,
    );

    // 不在路径走廊内 → 不受影响
    if (corridorDist > CORRIDOR_WIDTH) {
      return {
        city,
        distanceKm: dist,
        arrivalTime: null,
        level: "none" as const,
        label: "不在路径上",
      };
    }

    // 已在风圈内
    if (dist <= maxR7 && maxR7 > 0) {
      return {
        city,
        distanceKm: dist,
        arrivalTime: now,
        level: "affected" as const,
        label: "已受影响",
      };
    }

    const { t: fcT } = forecastInfo(city.lng, city.lat);

    // 用移动速度或预报时间估算 ETA
    const moveSpeedKmh = (latest.moveSpeed ?? latest.speed * 3.6 * 0.5) || 20;
    const hours = dist / moveSpeedKmh;
    const eta = fcT ?? now + hours * 3600e3;

    if (dist <= 200) {
      return {
        city,
        distanceKm: dist,
        arrivalTime: eta,
        level: "imminent" as const,
        label: `~${Math.round(hours)} 小时`,
      };
    }
    if (dist <= 500) {
      return {
        city,
        distanceKm: dist,
        arrivalTime: eta,
        level: "warning" as const,
        label: `~${Math.round(hours)} 小时`,
      };
    }
    if (dist <= 1000) {
      return {
        city,
        distanceKm: dist,
        arrivalTime: eta,
        level: "watching" as const,
        label: `~${Math.round(hours)} 小时`,
      };
    }

    return {
      city,
      distanceKm: dist,
      arrivalTime: null,
      level: "none" as const,
      label: "暂不受影响",
    };
  });
}

// ─── 行动建议 ────
export function getActionSuggestion(level: CityImpact["level"]): string {
  switch (level) {
    case "affected":
      return "停止外出，留在安全室内";
    case "imminent":
      return "加固门窗，准备应急物资";
    case "warning":
      return "采购必需品，关注预警";
    case "watching":
      return "关注台风动态";
    default:
      return "";
  }
}
