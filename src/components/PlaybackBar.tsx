import { useMemo, useEffect } from "react";
import { useTyphoonStore } from "../store/typhoon";
import { useTyphoonData } from "../hooks/useTyphoonData";
import { usePlayback } from "../hooks/usePlayback";

function fmtEpoch(ts: number): string {
  const d = new Date(ts + 8 * 3600000); // UTC+8
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export default function PlaybackBar() {
  usePlayback(); // 驱动动画循环

  const playbackTime = useTyphoonStore((s) => s.playbackTime);
  const isPlaying = useTyphoonStore((s) => s.isPlaying);
  const speed = useTyphoonStore((s) => s.playbackSpeed);
  const setPlaybackTime = useTyphoonStore((s) => s.setPlaybackTime);
  const setIsPlaying = useTyphoonStore((s) => s.setIsPlaying);
  const setPlaybackSpeed = useTyphoonStore((s) => s.setPlaybackSpeed);
  const setPlaybackMax = useTyphoonStore((s) => s.setPlaybackMax);
  const selectedIds = useTyphoonStore((s) => s.selectedIds);
  const activeTabId = useTyphoonStore((s) => s.activeTabId);

  // 使用当前激活 tab 的台风时间范围
  const typhoonId =
    activeTabId && selectedIds.includes(activeTabId)
      ? activeTabId
      : selectedIds[0];
  const { data } = useTyphoonData(typhoonId ?? null);

  const range = useMemo(() => {
    if (!data?.points.length) return { min: 0, max: 0 };
    const times = data.points.map((p) => p.t).filter(Boolean);
    return { min: Math.min(...times), max: Math.max(...times) };
  }, [data]);

  useEffect(() => {
    if (range.max > 0) setPlaybackMax(range.max);
  }, [range.max, setPlaybackMax]);

  if (selectedIds.length === 0) return null;

  const t = playbackTime ?? range.max;

  const speeds = [1, 2, 4];

  return (
    <div className="playback-bar">
      <button
        className="pb-btn"
        onClick={() => {
          // 播放结束 → 重头开始；全新开始 → 从 min 开始
          if (
            playbackTime === null ||
            (range.max > 0 && playbackTime >= range.max)
          ) {
            setPlaybackTime(range.min);
          }
          setIsPlaying(!isPlaying);
        }}
      >
        {isPlaying ? "⏸" : "▶"}
      </button>

      {speeds.map((s) => (
        <button
          key={s}
          className={`pb-btn ${speed === s ? "active" : ""}`}
          onClick={() => setPlaybackSpeed(s)}
        >
          {s}×
        </button>
      ))}

      <input
        type="range"
        className="pb-slider"
        min={range.min}
        max={range.max}
        step={3600000} // 1 小时步进
        value={t}
        onChange={(e) => {
          setPlaybackTime(Number(e.target.value));
        }}
      />

      <span className="pb-time">{fmtEpoch(t)}</span>

      <button className="pb-btn" onClick={() => setPlaybackTime(null)}>
        全部
      </button>
    </div>
  );
}
