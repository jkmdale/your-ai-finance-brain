
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
import { useState } from "react";

const Index = () => {
  const { user, loading } = useAuth();
  const { isAppLocked, setupComplete, preferredUnlockMethod, isPinSetup } = useAppSecurity();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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

  // If user is authenticated but PIN isn't set up yet, show PIN setup screen
  if (user && !isPinSetup) {
    return <PinSetupScreen />;
  }

  // If user has PIN set up but hasn't completed full security setup, 
  // show security method setup for preference selection
  if (user && isPinSetup && !setupComplete) {
    return <SecurityMethodSetup />;
  }

  // If user is authenticated and app is locked, show unlock screen
  if (user && setupComplete && isAppLocked) {
    return <UnlockScreen />;
  }

  // If user is authenticated, security is set up, and app is unlocked, show the main dashboard
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
