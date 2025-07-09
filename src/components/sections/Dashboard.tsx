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
    const handleData = (e) => {
      const { transactions, budget, goals } = e.detail;
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

      <StatsCards transactions={categorised} />

      <BudgetBreakdown budget={budget} />

      <SmartBudgetGoals goals={goals} />

      <RecentTransactions transactions={categorised} />
    </div>
  );
}
