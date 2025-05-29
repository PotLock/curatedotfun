import { create } from "zustand";
import { Submission } from "../types/twitter";

export type StatusFilterType = "all" | Submission["status"];
export type SortOrderType = "newest" | "oldest";

interface FilterState {
  // Filter values
  statusFilter: StatusFilterType;
  sortOrder: SortOrderType;

  // Actions
  setStatusFilter: (status: StatusFilterType) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  // Initial state
  statusFilter: "all",
  sortOrder: "newest",

  // Actions
  setStatusFilter: (status) => set({ statusFilter: status }),
}));
