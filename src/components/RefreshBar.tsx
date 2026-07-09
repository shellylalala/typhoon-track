import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTyphoonStore } from "../store/typhoon";
import { useTyphoonData } from "../hooks/useTyphoonData";

export default function RefreshBar() {
  const activeTabId = useTyphoonStore((s) => s.activeTabId);
  const selectedIds = useTyphoonStore((s) => s.selectedIds);
  const typhoonId =
    activeTabId && selectedIds.includes(activeTabId)
      ? activeTabId
      : selectedIds[0];
  const { data, dataUpdatedAt } = useTyphoonData(typhoonId ?? null);
  const latestTime = data?.points?.[data.points.length - 1]?.time;
  const queryClient = useQueryClient();

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── 数据更新提醒 ──
  const prevUpdatedAt = useRef(0);
  const [hasNew, setHasNew] = useState(false);
  useEffect(() => {
    if (prevUpdatedAt.current && dataUpdatedAt > prevUpdatedAt.current) {
      setHasNew(true);
      const t = setTimeout(() => setHasNew(false), 4000);
      return () => clearTimeout(t);
    }
    prevUpdatedAt.current = dataUpdatedAt;
  }, [dataUpdatedAt]);

  // 通过 refetchInterval 控制轮询开关
  queryClient.setQueryDefaults(["typhoon-detail"], {
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : false,
  });

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["typhoon-detail"] });
    await queryClient.invalidateQueries({ queryKey: ["typhoon-list"] });
    setRefreshing(false);
  }, [queryClient]);

  if (!typhoonId) return null;

  return (
    <div className="refresh-bar">
      <span className="refresh-time">
        {hasNew && <span className="refresh-dot">NEW</span>}
        最新观测 {latestTime ?? "—"}
      </span>
      <button className="refresh-btn" onClick={doRefresh} disabled={refreshing}>
        {refreshing ? "⏳" : "🔄"} 刷新
      </button>
      <label className="refresh-auto">
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.target.checked)}
        />
        自动
      </label>
    </div>
  );
}
