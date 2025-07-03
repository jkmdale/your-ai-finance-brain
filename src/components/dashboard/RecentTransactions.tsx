import React from 'react';
import { TransactionCard } from '@/components/ui/transaction-card';
import { TransactionTable } from '@/components/ui/transaction-table';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Transaction, DashboardStats } from '@/types/dashboard';

interface RecentTransactionsProps {
  recentTransactions: Transaction[];
  stats: DashboardStats;
}

export const RecentTransactions = ({ recentTransactions, stats }: RecentTransactionsProps) => {
  const isMobile = useIsMobile();

  if (recentTransactions.length === 0) return null;

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl shadow-2xl">
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
          <div className="flex items-center space-x-2">
            <span className="text-white/60 text-sm">{stats.transactionCount} total</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live data"></div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {isMobile ? (
          <div className="space-y-3">
            {recentTransactions.slice(0, 5).map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        ) : (
          <TransactionTable transactions={recentTransactions.slice(0, 10)} />
        )}
      </div>
      
      <div className="p-4 border-t border-white/20 text-center">
        <button 
          onClick={() => document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg font-medium"
        >
          View All AI-Categorized Transactions
        </button>
      </div>
    </div>
  );
};