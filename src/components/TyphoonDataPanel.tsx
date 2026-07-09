import { useTyphoonStore } from "../store/typhoon";
import { useTyphoonData } from "../hooks/useTyphoonData";
import { getIntensityLabel, getAgencyColor } from "../lib/geo";
import { useQuery } from "@tanstack/react-query";
import { fetchTyphoonList } from "../lib/api";
import type { TyphoonData } from "../types/typhoon";

const CURRENT_YEAR = 2026;

function TyphoonTab({ id }: { id: string }) {
  const { data, isLoading } = useTyphoonData(id);

  // 拿到名称（从列表缓存）
  const { data: list } = useQuery({
    queryKey: ["typhoon-list", CURRENT_YEAR],
    queryFn: () => fetchTyphoonList(CURRENT_YEAR),
    staleTime: 5 * 60 * 1000,
  });
  const name = list?.find((t) => t.id === id)?.name ?? id;

  if (isLoading) return <div className="dp-loading">加载台风数据...</div>;
  if (!data) return <div className="dp-error">无数据</div>;

  return <TyphoonDetail data={data} label={name} />;
}

function TyphoonDetail({ data, label }: { data: TyphoonData; label: string }) {
  const latest = data.points[data.points.length - 1];

  const forecastHidden = useTyphoonStore((s) => s.forecastHidden);
  const toggleForecastAgency = useTyphoonStore((s) => s.toggleForecastAgency);

  return (
    <div className="typhoon-detail">
      <div className="dp-header">
        <h3>{label}</h3>
        <span className="dp-id">#{data.id}</span>
        {data.active && <span className="badge active-badge">活跃</span>}
      </div>

      {/* 当前实测 */}
      {latest && (
        <div className="dp-current">
          <div className="dp-row">
            <span className="dp-label">强度</span>
            <span className="dp-value">{latest.strong}</span>
          </div>
          <div className="dp-row">
            <span className="dp-label">风力</span>
            <span className="dp-value">
              {latest.power ?? "?"} 级（{latest.speed} m/s）
            </span>
          </div>
          <div className="dp-row">
            <span className="dp-label">气压</span>
            <span className="dp-value">{latest.pressure} hPa</span>
          </div>
          <div className="dp-row">
            <span className="dp-label">位置</span>
            <span className="dp-value mono">
              {Number(latest.lat).toFixed(1)}°, {Number(latest.lng).toFixed(1)}°
            </span>
          </div>
          {latest.moveSpeed != null && (
            <div className="dp-row">
              <span className="dp-label">移动</span>
              <span className="dp-value">
                {latest.moveDir ?? ""} {latest.moveSpeed} km/h
              </span>
            </div>
          )}
        </div>
      )}

      {/* 风圈 */}
      {latest?.r7 && (
        <div className="dp-section">
          <div className="dp-section-title">风圈半径 (km)</div>
          <div className="dp-grid-4">
            {["东北", "东南", "西南", "西北"].map((dir, i) => (
              <div key={dir} className="dp-wind-cell">
                <div className="dp-wind-dir">{dir}</div>
                <div className="dp-wind-v">
                  <strong>{latest.r7![i]}</strong>
                  <small>7级</small>
                </div>
                <div className="dp-wind-v">
                  {latest.r10?.[i] ?? "-"}
                  <small>10级</small>
                </div>
                <div className="dp-wind-v">
                  {latest.r12?.[i] ?? "-"}
                  <small>12级</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 预报机构 */}
      {data.forecasts.length > 0 && (
        <div className="dp-section">
          <div className="dp-section-title">
            预报（{data.forecasts.length} 家机构）
          </div>
          {data.forecasts.map((fc) => (
            <div key={fc.agency} className="dp-agency">
              <label className="dp-agency-label">
                <input
                  type="checkbox"
                  checked={!forecastHidden.has(fc.agency)}
                  onChange={() => toggleForecastAgency(fc.agency)}
                />
                <span
                  className="dp-agency-dot"
                  style={{ background: getAgencyColor(fc.agency) }}
                />
                {fc.agency}
              </label>
              <span className="dp-agency-count">{fc.points.length} 个点</span>
            </div>
          ))}
        </div>
      )}

      {/* 实测点表格 */}
      <div className="dp-section">
        <div className="dp-section-title">
          实测路径（{data.points.length} 个点）
        </div>
        <div className="dp-table-wrap">
          <table className="dp-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>强度</th>
                <th>风速</th>
                <th>气压</th>
              </tr>
            </thead>
            <tbody>
              {[...data.points]
                .reverse()
                .slice(0, 20)
                .map((p) => (
                  <tr key={p.t}>
                    <td className="mono">{p.time.slice(5)}</td>
                    <td>{p.strong || getIntensityLabel(p.power)}</td>
                    <td>{p.speed} m/s</td>
                    <td>{p.pressure} hPa</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {data.points.length > 20 && (
            <div className="dp-table-hint">
              仅显示最近 20 个点（共 {data.points.length} 个）
            </div>
          )}
        </div>
      </div>

      <div className="dp-footer">数据源：{data.source}</div>
    </div>
  );
}

export default function TyphoonDataPanel() {
  const selectedIds = useTyphoonStore((s) => s.selectedIds);
  const activeTabId = useTyphoonStore((s) => s.activeTabId);
  const setActiveTab = useTyphoonStore((s) => s.setActiveTab);

  if (selectedIds.length === 0) {
    return (
      <div className="data-panel empty">
        <p>请从左侧列表选择台风</p>
      </div>
    );
  }

  const tabId =
    activeTabId && selectedIds.includes(activeTabId)
      ? activeTabId
      : selectedIds[0];

  return (
    <div className="data-panel">
      <div className="dp-tabs">
        {selectedIds.map((id) => (
          <button
            key={id}
            className={`dp-tab ${id === tabId ? "active" : ""}`}
            onClick={() => setActiveTab(id)}
          >
            {id.slice(4)}
          </button>
        ))}
      </div>
      <TyphoonTab key={tabId} id={tabId} />
    </div>
  );
}
