import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  merchant?: string;
  category?: string;
  is_income: boolean;
  user_id: string;
  account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  message: string;
  results?: {
    processed: number;
    skipped: number;
    errors: string[];
    warnings: string[];
  };
}

export interface AppState {
  // CSV Upload State
  uploadState: UploadState;
  setUploadState: (state: Partial<UploadState>) => void;
  resetUploadState: () => void;
  
  // Recent Transactions
  recentTransactions: Transaction[];
  setRecentTransactions: (transactions: Transaction[]) => void;
  addTransactions: (transactions: Transaction[]) => void;
  
  // Dashboard Data
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  setDashboardData: (data: { totalBalance: number; monthlyIncome: number; monthlyExpenses: number }) => void;
  
  // App State
  lastDataUpdate: string | null;
  setLastDataUpdate: (timestamp: string) => void;
  
  // Security State (for inactivity timer)
  lastActivity: number;
  setLastActivity: (timestamp: number) => void;
  
  // Utility Methods
  refreshData: () => void;
}

const initialUploadState: UploadState = {
  status: 'idle',
  progress: 0,
  message: '',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Upload State
      uploadState: initialUploadState,
      setUploadState: (newState) =>
        set((state) => ({
          uploadState: { ...state.uploadState, ...newState },
        })),
      resetUploadState: () => set({ uploadState: initialUploadState }),
      
      // Recent Transactions
      recentTransactions: [],
      setRecentTransactions: (transactions) => set({ recentTransactions: transactions }),
      addTransactions: (transactions) =>
        set((state) => {
          const existingIds = new Set(state.recentTransactions.map(t => t.id));
          const newTransactions = transactions.filter(t => !existingIds.has(t.id));
          return {
            recentTransactions: [...newTransactions, ...state.recentTransactions]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 100) // Keep only the most recent 100 transactions
          };
        }),
      
      // Dashboard Data
      totalBalance: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      setDashboardData: (data) => set(data),
      
      // App State
      lastDataUpdate: null,
      setLastDataUpdate: (timestamp) => set({ lastDataUpdate: timestamp }),
      
      // Security State
      lastActivity: Date.now(),
      setLastActivity: (timestamp) => set({ lastActivity: timestamp }),
      
      // Utility Methods
      refreshData: () => {
        const state = get();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentTransactions = state.recentTransactions.filter(
          t => new Date(t.date) >= thirtyDaysAgo
        );
        
        const income = recentTransactions
          .filter(t => t.is_income)
          .reduce((sum, t) => sum + t.amount, 0);
        
        const expenses = recentTransactions
          .filter(t => !t.is_income)
          .reduce((sum, t) => sum + t.amount, 0);
        
        set({
          monthlyIncome: income,
          monthlyExpenses: expenses,
          totalBalance: income - expenses,
          lastDataUpdate: new Date().toISOString(),
        });
      },
    }),
    {
      name: 'smart-finance-app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        recentTransactions: state.recentTransactions,
        totalBalance: state.totalBalance,
        monthlyIncome: state.monthlyIncome,
        monthlyExpenses: state.monthlyExpenses,
        lastDataUpdate: state.lastDataUpdate,
      }),
    }
  )
);