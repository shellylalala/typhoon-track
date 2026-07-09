import { create } from "zustand";

interface TyphoonState {
  /** 当前选中的台风id集合 */
  selectedIds: Set<string>;
  /** 切换单个台风选中状态 */
  toggleId: (id: string) => void;
  /** 全选/全不选 */
  toggleAll: (ids: string[]) => void;
  /** 是否选中了该id */
  isSelected: (id: string) => boolean;
}

export const useTyphoonStore = create<TyphoonState>((set, get) => ({
  selectedIds: new Set<string>(),

  toggleId: (id: string) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    });
  },

  toggleAll: (ids: string[]) => {
    set((state) => {
      const allSelected = ids.every((id) => state.selectedIds.has(id));
      if (allSelected) {
        return { selectedIds: new Set<string>() };
      }
      return { selectedIds: new Set(ids) };
    });
  },

  isSelected: (id: string) => get().selectedIds.has(id),
}));
