import { useQuery } from "@tanstack/react-query";
import { fetchTyphoonList } from "../lib/api";
import { useTyphoonStore } from "../store/typhoon";

const CURRENT_YEAR = new Date().getFullYear();

const TyphoonListPanel = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["typhoonList", CURRENT_YEAR],
    queryFn: () => fetchTyphoonList(CURRENT_YEAR),
  });

  const selectedIds = useTyphoonStore((state) => state.selectedIds);
  const toggleId = useTyphoonStore((state) => state.toggleId);
  const toggleAll = useTyphoonStore((state) => state.toggleAll);

  if (isLoading) return <div className="panel">加载台风列表...</div>;
  if (error)
    return (
      <div className="panel error">加载失败: {(error as Error).message}</div>
    );
  if (!data) return <div className="panel">暂无台风数据</div>;

  // 活跃台风置顶
  const sorted = [...data].sort(
    (a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0),
  );
  const allIds = sorted.map((t) => t.id);
  const allChecked = allIds.every((id) => selectedIds.has(id));
  const count = selectedIds.size;

  return (
    <div className="panel typhoon-list-panel">
      <div className="panel-header">
        <h2>台风列表 ({CURRENT_YEAR})</h2>
        <label className="select-all">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={() => toggleAll(allIds)}
          />
          全选
        </label>
      </div>

      {count > 3 && (
        <div className="perf-warning">
          ⚠ 已选择 {count} 个台风，同时显示可能影响性能
        </div>
      )}

      <ul className="typhoon-list">
        {sorted.map((t) => (
          <li key={t.id} className={t.active ? "active" : ""}>
            <label>
              <input
                type="checkbox"
                checked={selectedIds.has(t.id)}
                onChange={() => toggleId(t.id)}
              />
              <span className="typhoon-name">
                {t.name}
                <small>{t.enName}</small>
              </span>
              {t.active && <span className="badge active-badge">活跃</span>}
              <span className="typhoon-id">{t.id}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="panel-footer">
        已选: <strong>{count}</strong> / {sorted.length}
      </div>
    </div>
  );
};

export default TyphoonListPanel;
