// src/components/sections/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { BudgetBreakdown } from '@/components/dashboard/BudgetBreakdown';
import { SmartBudgetGoals } from '@/components/dashboard/SmartBudgetGoals';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const [categorised, setCategorised] = useState([]);
  const [budget, setBudget] = useState(null);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    const handleData = (e: any) => {
      const { transactions = [], budget = null, goals = [] } = e.detail || {};
      setCategorised(transactions);
      setBudget(budget);
      setGoals(goals);
    };

    window.addEventListener('csv-data-ready', handleData);
    return () => window.removeEventListener('csv-data-ready', handleData);
  }, []);

  if (!user) {
    return <div className="p-4">Please log in to view your dashboard.</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Welcome back 👋</h1>

      {categorised.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold">Total Transactions</h3>
              <p className="text-2xl font-bold">{categorised.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold">Income</h3>
              <p className="text-2xl font-bold text-green-600">
                ${categorised.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold">Expenses</h3>
              <p className="text-2xl font-bold text-red-600">
                ${Math.abs(categorised.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {categorised.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-2">
            {categorised.slice(0, 5).map((transaction: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-2 border-b">
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-gray-500">{transaction.date}</p>
                </div>
                <p className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(transaction.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {categorised.length === 0 && (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <p className="text-gray-600">No transactions uploaded yet. Upload some CSV files to get started!</p>
        </div>
      )}
    </div>
  );
}
