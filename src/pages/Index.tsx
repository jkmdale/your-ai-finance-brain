// src/pages/Index.tsx

import { LandingPage } from "@/components/sections/LandingPage";
import Dashboard from "@/components/sections/Dashboard";
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
  const [showAuth, setShowAuth] = useState<'signup' | 'signin'>('signup');

  // Inactivity timer
  useSimpleInactivityTimer();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!user && !setupComplete) {
    return <AuthScreen mode={showAuth} setMode={setShowAuth} />;
  }

  if (!setupComplete) {
    return <SecurityMethodSetup />;
  }

  if (!isPinSetup) {
    return <PinSetupScreen />;
  }

  if (isAppLocked) {
    return <UnlockScreen />;
  }

  return (
    <SidebarLayout>
      <LandingPage />
      <Dashboard />
      <BudgetOverview />
      <GoalTracking />
      <AIInsights />
      <TransactionHistory />
      <SmartGoalsCard />
    </SidebarLayout>
  );
};

export default Index;