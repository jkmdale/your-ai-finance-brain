// src/pages/Index.tsx

import { LandingPage } from "@/components/sections/LandingPage";
import { Dashboard } from "@/components/sections/Dashboard";
import { BudgetOverview } from "@/components/sections/BudgetOverview";
import { GoalTracking } from "@/components/sections/GoalTracking";
import { AIInsights } from "@/components/sections/AIInsights";
import { TransactionHistory } from "@/components/sections/TransactionHistory";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { SecurityMethodSetup } from "@/components/security/SecurityMethodSetup";
import { PinSetupScreen } from "@/components/security/PinSetupScreen";
import { UnlockScreen } from "@/components/security/UnlockScreen";
import { SidebarLayout } from "@/components/layout/SidebarNav";
import { useAuth } from "@/hooks/useAuth";
import { useAppSecurity } from "@/hooks/useAppSecurity";
import { useSimpleInactivityTimer } from "@/hooks/useSimpleInactivityTimer";
import { useState } from "react";
import SmartGoalsCard from "@/components/goals/SmartGoalsCard";

const Index = () => {
  const { user, loading } = useAuth();
  const { isAppLocked, setupComplete, preferredUnlockMethod, isPinSetup } = useAppSecurity();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  
  // Add inactivity timer
  useSimpleInactivityTimer();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  const handleGetStarted = () => {
    setAuthMode('signup');
    setShowAuth(true);
  };

  const handleSignIn = (mode: 'signup' | 'signin' = 'signin') => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
  };

  if (showAuth && !user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (!user) {
    return (
      <LandingPage 
        onGetStarted={handleGetStarted}
        onSignIn={handleSignIn}
      />
    );
  }

  if (user && !isPinSetup) {
    return <PinSetupScreen />;
  }

  if (user && isPinSetup && !setupComplete) {
    return <SecurityMethodSetup />;
  }

  if (user && setupComplete && isAppLocked) {
    return <UnlockScreen />;
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 space-y-3 sm:space-y-4 p-3 sm:p-4 safe-area-top safe-area-bottom">
        <div id="dashboard">
          <Dashboard />
        </div>
        <div id="goals">
          <BudgetOverview />
          <GoalTracking />
          <SmartGoalsCard />
        </div>
        <div id="insights">
          <AIInsights />  
        </div>
        <div id="csv-upload">
          <TransactionHistory />
        </div>
        <div id="coach">
          <AIInsights />
        </div>
      </div>
    </SidebarLayout>
  );
};

export default Index;