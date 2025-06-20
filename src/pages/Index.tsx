
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { Dashboard } from "@/components/sections/Dashboard";
import { BudgetOverview } from "@/components/sections/BudgetOverview";
import { GoalTracking } from "@/components/sections/GoalTracking";
import { AIInsights } from "@/components/sections/AIInsights";
import { TransactionHistory } from "@/components/sections/TransactionHistory";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();

  // If user is not authenticated, show the landing page
  if (!user) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Hero />
        <Features />
      </div>
    );
  }

  // If user is authenticated, show the dashboard and other sections
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Dashboard />
      <BudgetOverview />
      <GoalTracking />
      <AIInsights />
      <TransactionHistory />
    </div>
  );
};

export default Index;
