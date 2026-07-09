import type { TyphoonData, TyphoonListItem } from "../types/typhoon";

// 原始浙江源列表项
interface RawListItem {
  tfid: string;
  name: string;
  enname: string;
  starttime: string;
  endtime: string;
  isactive: string;
}

const normalize = (item: RawListItem): TyphoonListItem => {
  return {
    id: item.tfid,
    name: item.name,
    enName: item.enname,
    active: item.isactive === "1",
    startTime: item.starttime,
    endTime: item.endtime,
  };
};

export const fetchTyphoonList = async (
  year: number,
): Promise<TyphoonListItem[]> => {
  const res = await fetch(`/api/typhoon/list/${year}`);
  if (!res.ok) throw new Error(`列表请求失败: ${res.status}`);
  const raw: RawListItem[] = await res.json();
  return raw.map(normalize);
};

/** 浙江源风圈顺序为 NE|SE|NW|SW，统一转为 NE|SE|SW|NW 的 Quad */
function parseQuadZj(
  s: string | undefined | null,
): [number, number, number, number] | null {
  if (!s) return null;
  const parts = s.split("|").map(Number);
  if (parts.length !== 4 || parts.some((n) => !isFinite(n) || n <= 0))
    return null;
  return [parts[0], parts[1], parts[3], parts[2]];
}

/** 客户端归一化：兼容 dev proxy 原始 JSON 和 Worker 归一化后的数据 */
function normalizeDetail(raw: Record<string, unknown>): TyphoonData {
  // 提取顶层 forecasts —— Worker 已归一化则直接用，否则从 points[last].forecast 提取
  let forecasts: TyphoonData["forecasts"] =
    (raw.forecasts as TyphoonData["forecasts"]) ?? [];
  const pts = raw.points as Array<Record<string, unknown>> | undefined;
  if ((!forecasts || forecasts.length === 0) && Array.isArray(pts)) {
    for (let i = pts.length - 1; i >= 0; i--) {
      const fc = pts[i]?.forecast as Array<Record<string, unknown>> | undefined;
      if (fc && fc.length) {
        forecasts = fc.map((f) => ({
          agency: String(f.tm ?? ""),
          points: (
            (f.forecastpoints as Array<Record<string, unknown>>) ?? []
          ).map((q) => ({
            time: String(q.time ?? ""),
            t: Date.parse(String(q.time ?? "").replace(" ", "T") + "+08:00"),
            lng: Number(q.lng),
            lat: Number(q.lat),
            strong: String(q.strong ?? ""),
            speed: Number(q.speed) > 0 ? Number(q.speed) : null,
            pressure: Number(q.pressure) > 0 ? Number(q.pressure) : null,
          })),
        }));
        break;
      }
    }
  }

  return {
    id: String(raw.tfid ?? raw.id ?? ""),
    name: String(raw.name ?? ""),
    enName: String(raw.enname ?? raw.enName ?? ""),
    active: raw.isactive === "1" || raw.active === true,
    source: String(raw.source ?? "浙江省水利厅"),
    fetchedAt: String(raw.fetchedAt ?? new Date().toISOString()),
    points: (pts ?? []).map((p) => ({
      time: String(p.time ?? ""),
      t:
        Number(p.t) ||
        Date.parse(String(p.time ?? "").replace(" ", "T") + "+08:00"),
      lng: Number(p.lng),
      lat: Number(p.lat),
      strong: String(p.strong ?? ""),
      power: p.power != null ? Number(p.power) : null,
      speed: Number(p.speed),
      pressure: Number(p.pressure),
      moveSpeed: Number(p.moveSpeed ?? p.movespeed) || null,
      moveDir: (p.moveDir ?? p.movedirection ?? null) as string | null,
      r7: (p.r7 ?? parseQuadZj(String(p.radius7 ?? ""))) as
        | [number, number, number, number]
        | null,
      r10: (p.r10 ?? parseQuadZj(String(p.radius10 ?? ""))) as
        | [number, number, number, number]
        | null,
      r12: (p.r12 ?? parseQuadZj(String(p.radius12 ?? ""))) as
        | [number, number, number, number]
        | null,
    })),
    forecasts,
  };
}

export const fetchTyphoonDetail = async (id: string): Promise<TyphoonData> => {
  const res = await fetch(`/api/typhoon/${id}`);
  if (!res.ok) throw new Error(`详情请求失败: ${res.status}`);
  const raw = await res.json();
  return normalizeDetail(raw);
};

// ─── 地理编码（Open-Meteo，免费无 key，支持全球城市搜索）───
export interface GeocodingResult {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export async function searchCity(query: string): Promise<GeocodingResult[]> {
  if (query.length < 2) return [];
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=zh&format=json`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).map((r: Record<string, unknown>) => ({
    name: String(r.name ?? ""),
    country: String(r.country ?? ""),
    lat: Number(r.latitude),
    lng: Number(r.longitude),
  }));
}
