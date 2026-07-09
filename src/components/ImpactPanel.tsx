import { useMemo, useState, useEffect, useRef } from "react";
import { useTyphoonStore } from "../store/typhoon";
import { useTyphoonData } from "../hooks/useTyphoonData";
import {
  calculateImpacts,
  getActionSuggestion,
  findRelevantCities,
  type City,
} from "../lib/impact";
import { searchCity, type GeocodingResult } from "../lib/api";

const LEVEL_ORDER: Record<string, number> = { affected: 0, imminent: 1, warning: 2, watching: 3, none: 4 };
const LEVEL_LABELS: Record<string, string> = {
  affected: "🔴 已受影响", imminent: "🟠 12h 内", warning: "🟡 24h 内",
  watching: "🔵 72h 内", none: "⚪ 暂不影响",
};

function formatCountdown(eta: number | null, now: number): string {
  if (!eta) return "—";
  const diff = eta - now;
  if (diff <= 0) return "已到达";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 24 ? `${Math.floor(h / 24)}天${h % 24}时` : `${h}时${m}分`;
}

export default function ImpactPanel() {
  const activeTabId = useTyphoonStore((s) => s.activeTabId);
  const selectedIds = useTyphoonStore((s) => s.selectedIds);
  const customCities = useTyphoonStore((s) => s.customCities);
  const addCustomCity = useTyphoonStore((s) => s.addCustomCity);
  const removeCustomCity = useTyphoonStore((s) => s.removeCustomCity);

  const typhoonId = activeTabId && selectedIds.includes(activeTabId) ? activeTabId : selectedIds[0];
  const { data } = useTyphoonData(typhoonId ?? null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // 地理编码搜索
  const [cityInput, setCityInput] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timerRef.current);
    const q = cityInput;
    timerRef.current = setTimeout(() => {
      void searchCity(q).then(setResults);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [cityInput]);

  // 合并城市：路径沿线自动推荐（CITY_DB 中国城市） + 自定义
  const cities = useMemo((): City[] => {
    if (!data) return [...customCities];
    const forecasts = data.forecasts.flatMap((f) => f.points);
    const auto = findRelevantCities(data.points, forecasts);
    const map = new Map<string, City>();
    for (const c of auto) map.set(c.id, c);
    for (const c of customCities) map.set(c.id, c);
    return [...map.values()];
  }, [data, customCities]);

  const impacts = useMemo(() => {
    if (!data || !data.points.length || cities.length === 0) return [];
    const latest = data.points[data.points.length - 1];
    const fc = data.forecasts.flatMap((f) => f.points);
    return calculateImpacts(cities, data.points, latest.r7, fc, now);
  }, [data, cities, now]);

  if (!typhoonId) {
    return <div className="impact-panel empty"><p>请选择台风查看城市影响</p></div>;
  }

  // 排序：自定义城市优先 → 然后按影响等级
  const sorted = [...impacts].sort((a, b) => {
    const aCustom = customCities.some((c) => c.id === a.city.id) ? 0 : 1;
    const bCustom = customCities.some((c) => c.id === b.city.id) ? 0 : 1;
    if (aCustom !== bCustom) return aCustom - bCustom;
    return (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9);
  });
  const params = new URLSearchParams(window.location.search);
  const focusCity = params.get("city");

  return (
    <div className="impact-panel">
      <div className="impact-header">城市波及预估 — {data?.name ?? typhoonId}</div>

      <div className="impact-add">
        <input
          className="impact-input"
          placeholder="搜索任意城市…"
          value={cityInput}
          onChange={(e) => { setCityInput(e.target.value); setShowSuggest(true); }}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
        />
        {showSuggest && results.length > 0 && (
          <div className="impact-suggestions">
            {results.map((r) => {
              const id = `geo-${r.lat.toFixed(2)}-${r.lng.toFixed(2)}`;
              return (
                <div key={id} className="impact-suggest-item" onMouseDown={() => {
                  const city: City = { id, name: `${r.name}${r.country ? `, ${r.country}` : ""}`, lat: r.lat, lng: r.lng };
                  if (!cities.some((x) => x.id === city.id)) addCustomCity(city);
                  setCityInput("");
                  setResults([]);
                  setShowSuggest(false);
                }}>
                  {r.name}{r.country ? `, ${r.country}` : ""}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sorted.map((imp) => (
        <div key={imp.city.id} id={`city-${imp.city.id}`}
          className={`impact-row ${imp.level} ${focusCity === imp.city.id ? "focused" : ""}`}>
          <div className="impact-city">
            {imp.city.name}
            <span className="impact-level-tag">{LEVEL_LABELS[imp.level]}</span>
            {customCities.some((c) => c.id === imp.city.id) && (
              <button className="impact-remove" onClick={() => removeCustomCity(imp.city.id)}>×</button>
            )}
          </div>
          <div className="impact-time">
            {imp.level !== "none" ? formatCountdown(imp.arrivalTime, now) : imp.label}
          </div>
          {imp.level !== "none" && (
            <div className="impact-action">{getActionSuggestion(imp.level)}</div>
          )}
        </div>
      ))}
    </div>
  );
}
