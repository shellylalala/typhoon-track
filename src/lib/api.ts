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
function normalizeDetail(raw: any): TyphoonData {
  // 提取顶层 forecasts —— Worker 已归一化则直接用，否则从 points[last].forecast 提取
  let forecasts = raw.forecasts ?? [];
  if ((!forecasts || forecasts.length === 0) && Array.isArray(raw.points)) {
    for (let i = raw.points.length - 1; i >= 0; i--) {
      const fc = raw.points[i]?.forecast;
      if (fc && fc.length) {
        forecasts = fc.map((f: any) => ({
          agency: f.tm,
          points: (f.forecastpoints ?? []).map((q: any) => ({
            time: q.time,
            t: Date.parse((q.time ?? "").replace(" ", "T") + "+08:00"),
            lng: Number(q.lng),
            lat: Number(q.lat),
            strong: q.strong || "",
            speed: Number(q.speed) > 0 ? Number(q.speed) : null,
            pressure: Number(q.pressure) > 0 ? Number(q.pressure) : null,
          })),
        }));
        break;
      }
    }
  }

  return {
    id: String(raw.tfid ?? raw.id),
    name: raw.name,
    enName: raw.enname ?? raw.enName,
    active: raw.isactive === "1" || raw.active === true,
    source: raw.source ?? "浙江省水利厅",
    fetchedAt: raw.fetchedAt ?? new Date().toISOString(),
    points: (raw.points ?? []).map((p: any) => ({
      time: p.time,
      t: p.t ?? Date.parse((p.time ?? "").replace(" ", "T") + "+08:00"),
      lng: Number(p.lng),
      lat: Number(p.lat),
      strong: p.strong || "",
      power: p.power != null ? Number(p.power) : null,
      speed: Number(p.speed),
      pressure: Number(p.pressure),
      moveSpeed: p.moveSpeed ?? (p.movespeed ? Number(p.movespeed) : null),
      moveDir: p.moveDir ?? p.movedirection ?? null,
      r7: p.r7 ?? parseQuadZj(p.radius7),
      r10: p.r10 ?? parseQuadZj(p.radius10),
      r12: p.r12 ?? parseQuadZj(p.radius12),
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
