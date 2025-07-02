// Simple app store without complex Zustand persistence
import { create } from 'zustand';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  is_income: boolean;
}

interface AppState {
  transactions: Transaction[];
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  uploadMessage: string;
  setTransactions: (transactions: Transaction[]) => void;
  setUploadStatus: (status: 'idle' | 'uploading' | 'success' | 'error') => void;
  setUploadMessage: (message: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  transactions: [],
  uploadStatus: 'idle',
  uploadMessage: '',
  setTransactions: (transactions) => set({ transactions }),
  setUploadStatus: (uploadStatus) => set({ uploadStatus }),
  setUploadMessage: (uploadMessage) => set({ uploadMessage }),
}));