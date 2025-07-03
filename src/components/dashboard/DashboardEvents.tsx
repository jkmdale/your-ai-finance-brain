import { useEffect } from 'react';

interface DashboardEventsProps {
  onRefresh: () => void;
  onResetInsights: () => void;
}

export const DashboardEvents = ({ onRefresh, onResetInsights }: DashboardEventsProps) => {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'csv-upload-complete') {
        console.log('📂 CSV upload detected via storage, refreshing dashboard...');
        setTimeout(() => {
          onRefresh();
          onResetInsights();
        }, 2000);
      }
    };

    const handleCustomEvent = (event: any) => {
      console.log('📂 Custom CSV upload event detected:', event.detail);
      const detail = event.detail || {};
      
      console.log(`📊 Processing ${detail.totalTransactions || 0} transactions from ${detail.filesProcessed || 0} files`);
      
      // Longer delay for multiple files or large transaction counts
      const delay = detail.totalTransactions > 100 || detail.filesProcessed > 1 ? 3000 : 2000;
      
      setTimeout(() => {
        console.log('🔄 Refreshing dashboard after CSV upload...');
        onRefresh();
        onResetInsights();
      }, delay);
    };

    const handleTransactionsCategorized = (event: any) => {
      console.log('🧠 Transactions categorized event detected:', event.detail);
      const detail = event.detail || {};
      
      console.log(`📊 Categorized ${detail.totalCategorized || 0} transactions`);
      
      // Immediate refresh since categorization is complete
      setTimeout(() => {
        console.log('🔄 Refreshing dashboard after AI categorization...');
        onRefresh();
        onResetInsights();
      }, 1000);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('csv-upload-complete', handleCustomEvent);
    window.addEventListener('transactions-categorized', handleTransactionsCategorized);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('csv-upload-complete', handleCustomEvent);
      window.removeEventListener('transactions-categorized', handleTransactionsCategorized);
    };
  }, [onRefresh, onResetInsights]);

  return null; // This component only handles events, no UI
};