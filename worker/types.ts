/**
 * 原始 API 响应类型：浙江水利厅台风 API 和中央气象台 NMC JSONP 接口
 *
 * 仅用于 worker/normalize.ts 的数据归一化层，不暴露给前端。
 */

// ─── 浙江水利厅台风 API ────────────────────────────────

/** 浙江源单个预报点 */
export interface ZjRawForecastPoint {
  time: string; // "2026-07-06 23:00:00" (北京时间)
  lng: string | number;
  lat: string | number;
  strong: string;
  speed: string | number;
  pressure: string | number;
}

/** 浙江源单个机构预报 */
export interface ZjRawForecast {
  tm: string; // 机构名："中国" / "日本" / "美国" / "中国台湾" / "中国香港"
  forecastpoints: ZjRawForecastPoint[];
}

/** 浙江源单个实测点 */
export interface ZjRawPoint {
  time: string; // "2026-07-06 23:00:00" (北京时间)
  lng: string | number;
  lat: string | number;
  strong: string;
  power?: string | number;
  speed: string | number;
  pressure: string | number;
  movespeed?: string | number;
  movedirection?: string;
  radius7?: string; // "150|120|100|80"
  radius10?: string;
  radius12?: string;
  forecast?: ZjRawForecast[];
}

/** 浙江源完整响应（/Api/TyphoonInfo/:tfid） */
export interface ZjRawResponse {
  tfid: string | number;
  name: string;
  enname: string;
  isactive: string; // "0" | "1"
  points: ZjRawPoint[];
}

/** 浙江源列表项（/Api/TyphoonList） */
export interface ZjRawListItem {
  tfid: string | number;
  name: string;
  enname: string;
  isactive: string; // "0" | "1"
  starttime: string;
  endtime: string;
}

// ─── 中央气象台 NMC JSONP ──────────────────────────────

/**
 * NMC 使用基于位置索引的数组传递数据，结构松散。此处用 unknown[] 承载，
 * 在 normalize.ts 中通过内联类型断言 (as string / as number) 访问具体字段。
 */

/** NMC 风圈数组：[code, ne, se, sw, nw][] */
export type NmcRawRadii = [string, number, number, number, number][];

/** NMC 实测点（基于位置索引的 unknown 数组） */
export type NmcRawPoint = readonly unknown[];

/** NMC 预报点（基于位置索引的 unknown 数组） */
export type NmcRawForecastPoint = readonly unknown[];

/** NMC JSONP 解析后的顶层结构 */
export interface NmcRawResponse {
  typhoon: [
    number, // [0] internal id
    string, // [1] enName
    string, // [2] name
    string, // [3] shortId like "2609"
    unknown, // [4]
    unknown, // [5]
    unknown, // [6]
    string, // [7] status "start" | "stop"
    NmcRawPoint[], // [8] points
  ];
}

/** NMC 列表 JSONP 解析后的顶层结构（list_2026 等） */
export interface NmcRawListResponse {
  typhoonList: NmcRawListEntry[];
}

/** NMC 列表单项：[internalId, enName, name, shortId, ...] */
export type NmcRawListEntry = readonly [
  number,
  string,
  string,
  string,
  ...unknown[],
];
