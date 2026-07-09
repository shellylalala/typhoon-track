import { create } from "zustand";

interface TyphoonState {
  /** 当前选中的台风id集合 */
  selectedIds: string[];
  /** 切换单个台风选中状态 */
  toggleId: (id: string) => void;
  /** 全选/全不选 */
  toggleAll: (ids: string[]) => void;
  /** 是否选中了该id */
  isSelected: (id: string) => boolean;
  /** 设置当前激活的标签页id */
  setActiveTab: (id: string | null) => void;
  /** 当前激活的标签页id */
  activeTabId: string | null;
  /** 隐藏的预报机构集合 */
  forecastHidden: Set<string>;
  /** 切换预报机构可见性 */
  toggleForecastAgency: (agency: string) => void;
  /** 回放当前时间 (epoch ms)；null = 显示全部路径 */
  playbackTime: number | null;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 播放倍速 */
  playbackSpeed: number; // 1 | 2 | 4
  /** 回放时间上限 (epoch ms) */
  playbackMax: number | null;

  setPlaybackTime: (t: number | null) => void;
  setIsPlaying: (v: boolean) => void;
  setPlaybackSpeed: (v: number) => void;
  setPlaybackMax: (max: number | null) => void;
}

export const useTyphoonStore = create<TyphoonState>((set, get) => ({
  selectedIds: [],
  activeTabId: null,
  forecastHidden: new Set<string>(),
  playbackTime: null,
  isPlaying: false,
  playbackSpeed: 1,
  playbackMax: null,

  toggleId: (id: string) => {
    set((state) => {
      const next = [...state.selectedIds];
      const index = next.indexOf(id);
      if (index !== -1) {
        next.splice(index, 1);
      } else {
        next.push(id);
      }
      return { selectedIds: next };
    });
  },

  toggleAll: (ids: string[]) => {
    set((state) => {
      const allSelected = ids.every((id) => state.selectedIds.includes(id));
      if (allSelected) {
        return { selectedIds: [] };
      }
      return { selectedIds: [...ids] };
    });
  },

  toggleForecastAgency: (agency: string) => {
    set((state) => {
      const next = new Set(state.forecastHidden);
      if (next.has(agency)) {
        next.delete(agency);
      } else {
        next.add(agency);
      }
      return { forecastHidden: next };
    });
  },

  setActiveTab: (id: string | null) => set({ activeTabId: id }),
  isSelected: (id: string) => get().selectedIds.includes(id),
  setPlaybackTime: (t) => set({ playbackTime: t }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setPlaybackSpeed: (v) => set({ playbackSpeed: v }),
  setPlaybackMax: (max) => set({ playbackMax: max }),
}));
