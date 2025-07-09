// src/components/sections/Dashboard.tsx

import React, { useState, useEffect } from 'react'; import { StatsCards } from '@/components/dashboard/StatsCards'; import { BudgetBreakdown } from '@/components/dashboard/BudgetBreakdown'; import { SmartBudgetGoals } from '@/components/dashboard/SmartBudgetGoals'; import { RecentTransactions } from '@/components/dashboard/RecentTransactions'; import { useAuth } from '@/hooks/useAuth';

export default function Dashboard({ data }) { const { user } = useAuth();

const [categorised, setCategorised] = useState([]); const [budget, setBudget] = useState(null); const [goals, setGoals] = useState([]);

// These would come from csvProcessor's runFullPipeline useEffect(() => { if (data?.transactions?.length > 0) { setCategorised(data.transactions); setBudget(data.budget); setGoals(data.goals); } }, [data]);

if (!user) return <div className="p-4">Please log in to view your dashboard.</div>;

return ( <div className="p-4 space-y-6"> <h1 className="text-2xl font-bold">Welcome back 👋</h1>

<StatsCards transactions={categorised} />

  <BudgetBreakdown budget={budget} />

  <SmartBudgetGoals goals={goals} />

  <RecentTransactions transactions={categorised} />
</div>

); }
