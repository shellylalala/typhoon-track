/**
 * Cloudflare Worker：台风数据边缘代理
 *
 * GET /api/typhoon/list/:year         — 台风列表
 * GET /api/typhoon/:tfid               — 台风详情（主源+备源容灾）
 * GET /api/health                      — 健康检查
 * 其余请求 → 静态资源
 */

import {
  normalizeZj,
  normalizeNmc,
  normalizeList,
  type TyphoonData,
  type TyphoonListItem,
} from "./normalize";

import {
  ZjRawResponse,
  type ZjRawListItem,
  type NmcRawListResponse,
} from "./types";

interface Env {
  ASSETS: Fetcher;
}

const CACHE_TTL = 300;
const UPSTREAM_TIMEOUT = 10_000;

const JSON_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": `public,max-age=${CACHE_TTL}`,
};

const fetchWithTimeout = async (
  url: string,
  init: RequestInit = {},
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/** 主数据源：浙江省水利局 */
const fromZj = async (tfid: string): Promise<TyphoonData> => {
  const res = await fetchWithTimeout(
    `https://typhoon.slt.zj.gov.cn/Api/TyphoonInfo/${tfid}`,
    { headers: { referer: "https://typhoon.slt.zj.gov.cn/wap.html" } },
  );
  if (!res.ok) throw new Error(`ZJ upstream HTTP ${res.status}`);
  const raw: ZjRawResponse = await res.json();
  if (!raw || !Array.isArray(raw.points) || raw.points.length === 0) {
    throw new Error("ZJ upstream 返回空数据");
  }
  return normalizeZj(raw);
};

/** 备源：中央气象台NMC */
const fromNmc = async (tfid: string): Promise<TyphoonData> => {
  const year = tfid.slice(0, 4);
  const listRes = await fetchWithTimeout(
    `http://typhoon.nmc.cn/weatherservice/typhoon/jsons/list_${year}`,
    { headers: { referer: "http://typhoon.nmc.cn/web.html" } },
  );
  if (!listRes.ok) throw new Error(`NMC list HTTP ${listRes.status}`);
  const listText = await listRes.text();
  const lm = listText.match(/^[\w$]+\((.*)\)\s*;?\s*$/s);
  if (!lm) throw new Error("NMC list JSONP 无法解析");
  const shortId = tfid.slice(2);
  const parsed = JSON.parse(lm[1]) as NmcRawListResponse;
  const entry = parsed.typhoonList.find((t) => String(t[3]) === shortId);
  if (!entry) throw new Error(`NMC 未找到台风 ${tfid}`);

  const viewRes = await fetchWithTimeout(
    `http://typhoon.nmc.cn/weatherservice/typhoon/jsons/view_${entry[0]}`,
    { headers: { referer: "http://typhoon.nmc.cn/web.html" } },
  );
  if (!viewRes.ok) throw new Error(`NMC view HTTP ${viewRes.status}`);
  return normalizeNmc(await viewRes.text());
};

/** 列表路由 */
const handleList = async (year: string): Promise<Response> => {
  if (!/^\d{4}$/.test(year)) {
    return new Response(JSON.stringify({ error: "年份格式应为 4 位数字" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }
  const res = await fetchWithTimeout(
    `https://typhoon.slt.zj.gov.cn/Api/TyphoonList/${year}`,
    { headers: { referer: "https://typhoon.slt.zj.gov.cn/wap.html" } },
  );
  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: `列表获取失败 HTTP ${res.status}` }),
      { status: 502, headers: JSON_HEADERS },
    );
  }
  const raw: ZjRawListItem[] = await res.json();
  const data: TyphoonListItem[] = normalizeList(raw);
  return new Response(JSON.stringify(data), { headers: JSON_HEADERS });
};

/** 详情路由 */
const handleTyphoon = async (
  request: Request,
  tfid: string,
): Promise<Response> => {
  if (!/^\d{6}$/.test(tfid)) {
    return new Response(
      JSON.stringify({ error: "台风编号格式应为 6 位数字" }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(
    new URL(`/api/typhoon/${tfid}`, request.url).toString(),
  );
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const errors: string[] = [];
  let data: TyphoonData | null = null;
  try {
    data = await fromZj(tfid);
  } catch (e) {
    errors.push(`primary: ${(e as Error).message}`);
  }
  if (!data) {
    try {
      data = await fromNmc(tfid);
    } catch (e) {
      errors.push(`fallback: ${(e as Error).message}`);
    }
  }
  if (!data) {
    return new Response(
      JSON.stringify({ error: "所有数据源均不可用", detail: errors }),
      {
        status: 502,
        headers: { ...JSON_HEADERS, "cache-control": "no-store" },
      },
    );
  }

  const response = new Response(JSON.stringify(data), {
    headers: JSON_HEADERS,
  });
  await cache.put(cacheKey, response.clone());
  return response;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: JSON_HEADERS,
      });
    }

    const listMatch = url.pathname.match(/^\/api\/typhoon\/list\/(\d{4})$/);
    if (listMatch) return handleList(listMatch[1]);

    const typhoonMatch = url.pathname.match(/^\/api\/typhoon\/(\d{6})$/);
    if (typhoonMatch) return handleTyphoon(request, typhoonMatch[1]);

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
