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
}

export const useTyphoonStore = create<TyphoonState>((set, get) => ({
  selectedIds: [],
  activeTabId: null,

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

  setActiveTab: (id: string | null) => set({ activeTabId: id }),
  isSelected: (id: string) => get().selectedIds.includes(id),
}));
