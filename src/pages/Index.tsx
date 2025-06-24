
import { LandingPage } from "@/components/sections/LandingPage";
import { Dashboard } from "@/components/sections/Dashboard";
import { BudgetOverview } from "@/components/sections/BudgetOverview";
import { GoalTracking } from "@/components/sections/GoalTracking";
import { AIInsights } from "@/components/sections/AIInsights";
import { TransactionHistory } from "@/components/sections/TransactionHistory";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { SidebarLayout } from "@/components/layout/SidebarNav";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const Index = () => {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

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
  if (showAuth && !user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // If user is not authenticated, always show the landing page first
  if (!user) {
    return (
      <LandingPage 
        onGetStarted={handleGetStarted}
        onSignIn={handleSignIn}
      />
    );
  }

  // If user is authenticated, show the main dashboard with sidebar
  return (
    <SidebarLayout>
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Dashboard />
        <BudgetOverview />
        <GoalTracking />
        <AIInsights />
        <TransactionHistory />
      </div>
    </SidebarLayout>
  );
};

export default Index;
