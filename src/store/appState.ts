import { create } from 'zustand';

interface AppState {
  activeMonth: string;
  totalTransactions: number;
  setActiveMonth: (month: string) => void;
  setTotalTransactions: (count: number) => void;
}

export const useAppState = create<AppState>((set) => ({
  activeMonth: new Date().toISOString().slice(0, 7), // Current month as default
  totalTransactions: 0,
  setActiveMonth: (month) => set({ activeMonth: month }),
  setTotalTransactions: (count) => set({ totalTransactions: count }),
}));