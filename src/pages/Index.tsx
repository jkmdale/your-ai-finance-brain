
import { LandingPage } from "@/components/sections/LandingPage";
import { Dashboard } from "@/components/sections/Dashboard";
import { BudgetOverview } from "@/components/sections/BudgetOverview";
import { GoalTracking } from "@/components/sections/GoalTracking";
import { AIInsights } from "@/components/sections/AIInsights";
import { TransactionHistory } from "@/components/sections/TransactionHistory";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const Index = () => {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const handleGetStarted = () => {
    setShowAuth(true);
  };

  const handleSignIn = () => {
    setShowAuth(true);
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
  };

  // Show auth screen if requested
  if (showAuth) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // If user is not authenticated, show the landing page
  if (!user) {
    return (
      <LandingPage 
        onGetStarted={handleGetStarted}
        onSignIn={handleSignIn}
      />
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
