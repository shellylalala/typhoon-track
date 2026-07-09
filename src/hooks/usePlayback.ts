import { useEffect, useRef } from "react";
import { useTyphoonStore } from "../store/typhoon";

/**
 * requestAnimationFrame 驱动的播放循环。
 * 组件卸载 / 页面不可见 / isPlaying=false 时自动暂停。
 */
export const usePlayback = () => {
  const isPlaying = useTyphoonStore((s) => s.isPlaying);
  const speed = useTyphoonStore((s) => s.playbackSpeed);
  const playbackMax = useTyphoonStore((s) => s.playbackMax);
  const setPlaybackTime = useTyphoonStore((s) => s.setPlaybackTime);
  const setIsPlaying = useTyphoonStore((s) => s.setIsPlaying);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    lastFrameRef.current = performance.now();

    const tick = (now: number) => {
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      const max = useTyphoonStore.getState().playbackMax;
      let next =
        (useTyphoonStore.getState().playbackTime ?? Date.now()) +
        delta * speed * 3600;

      if (max && next >= max) {
        next = max;
        setIsPlaying(false);
      }

      setPlaybackTime(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, speed, playbackMax, setPlaybackTime, setIsPlaying]);

  // 页面不可见时暂停
  useEffect(() => {
    const onHide = () => setIsPlaying(false);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) setIsPlaying(false);
    });
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [setIsPlaying]);
};
