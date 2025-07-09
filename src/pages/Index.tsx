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
import { CSVUpload } from "@/components/sections/CSVUpload";

const Index = () => {
  const { user, loading } = useAuth();
  const { isAppLocked, setupComplete, preferredUnlockMethod, isPinSetup } = useAppSecurity();
  const [showAuth, setShowAuth] = useState<'signup' | 'signin'>('signup');
  const [showAuthScreen, setShowAuthScreen] = useState(false);

  // Inactivity timer
  useSimpleInactivityTimer();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // Show auth screen if user explicitly requests it OR if no user and not set up
  if (showAuthScreen || (!user && !setupComplete)) {
    return <AuthScreen onAuthSuccess={() => setShowAuthScreen(false)} />;
  }

  // If user exists but security setup isn't complete
  if (user && !setupComplete) {
    return <SecurityMethodSetup />;
  }

  // If user exists but PIN isn't set up
  if (user && !isPinSetup) {
    return <PinSetupScreen />;
  }

  // If app is locked
  if (isAppLocked) {
    return <UnlockScreen />;
  }

  const handleGetStarted = () => {
    console.log('🔵 Get Started clicked');
    setShowAuthScreen(true);
  };

  const handleSignIn = (mode: 'signup' | 'signin' = 'signin') => {
    console.log('🔵 Sign In clicked with mode:', mode);
    setShowAuth(mode);
    setShowAuthScreen(true);
  };

  // If no user, show landing page
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
        <LandingPage 
          onGetStarted={handleGetStarted} 
          onSignIn={handleSignIn} 
        />
      </div>
    );
  }

  // User is logged in and everything is set up - show the main app
  return (
    <SidebarLayout>
      <CSVUpload />
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