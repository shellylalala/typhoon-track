// 风圈四象限，单位 km，顺序：东北 | 东南 | 西南 | 西北
export type Quad = [number, number, number, number];

export interface TrackPoint {
  time: string; // "2026-07-06 23:00" (北京时间)
  t: number; // epoch ms
  lng: number;
  lat: number;
  strong: string; // "超强台风" / "强热带风暴" 等
  power: number | null; // 风力等级
  speed: number; // 中心最大风速 m/s
  pressure: number; // 中心气压 hPa
  moveSpeed: number | null; // 移动速度 km/h
  moveDir: string | null; // 移动方向中文
  r7: Quad | null;
  r10: Quad | null;
  r12: Quad | null;
}

export interface ForecastPoint {
  time: string;
  t: number;
  lng: number;
  lat: number;
  strong: string;
  speed: number | null;
  pressure: number | null;
}

export interface AgencyForecast {
  agency: string; // "中国" / "日本" / "美国" / "中国台湾" / "中国香港"
  points: ForecastPoint[];
}

export interface TyphoonData {
  id: string;
  name: string;
  enName: string;
  active: boolean;
  source: string;
  fetchedAt: string; // ISO
  points: TrackPoint[];
  forecasts: AgencyForecast[];
}

// 列表项（来自 /Api/TyphoonList）
export interface TyphoonListItem {
  id: string; // tfid，如 "202609"
  name: string; // 中文名
  enName: string; // 英文名
  active: boolean; // isactive === "1"
  startTime: string;
  endTime: string;
}
