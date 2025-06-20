
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PWAInstall } from "@/components/PWAInstall";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { SecuritySetup } from "@/components/auth/SecuritySetup";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, session, loading, hasPin, hasBiometric, signOut } = useAuth();
  const [showSecuritySetup, setShowSecuritySetup] = useState(false);
  const [hasCheckedSecurity, setHasCheckedSecurity] = useState(false);
  const [authRequired, setAuthRequired] = useState(true);

  // Clear any existing sessions on app start - CRITICAL for security
  useEffect(() => {
    const clearSessionsOnStart = async () => {
      console.log('App starting - checking for session persistence');
      
      // Check if this is a fresh app load (not a navigation within the app)
      const isAppStart = !sessionStorage.getItem('app_initialized');
      
      if (isAppStart) {
        console.log('Fresh app load detected - clearing sessions for security');
        sessionStorage.setItem('app_initialized', 'true');
        
        // Clear any persisted auth state to force re-authentication
        if (user || session) {
          console.log('Clearing existing session - user must re-authenticate');
          await signOut();
          setAuthRequired(true);
          return;
        }
      }
      
      // If we have a valid session after the security check, allow access
      if (user && session) {
        console.log('Valid session found after security check');
        setAuthRequired(false);
      }
    };

    clearSessionsOnStart();
  }, [user, session, signOut]);

  // Handle security setup after authentication
  useEffect(() => {
    if (user && session && !loading && !hasCheckedSecurity && !authRequired) {
      const hasCompletedSetup = localStorage.getItem('securitySetupCompleted');
      const preferredMethod = localStorage.getItem('preferredAuthMethod');
      const needsSecuritySetup = !hasCompletedSetup && !hasPin && !hasBiometric && !preferredMethod;
      
      setShowSecuritySetup(needsSecuritySetup);
      setHasCheckedSecurity(true);
    }
  }, [user, session, loading, hasPin, hasBiometric, hasCheckedSecurity, authRequired]);

  const handleSecuritySetupComplete = () => {
    localStorage.setItem('securitySetupCompleted', 'true');
    setShowSecuritySetup(false);
  };

  const handleSecuritySetupSkip = () => {
    localStorage.setItem('securitySetupCompleted', 'true');
    setShowSecuritySetup(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  // ALWAYS require authentication on app start - no exceptions
  if (authRequired || !user || !session) {
    console.log('Authentication required - showing login screen');
    return <AuthScreen onAuthSuccess={() => setAuthRequired(false)} />;
  }

  return (
    <BrowserRouter>
      <SidebarProvider>
        <div className="min-h-screen flex w-full max-w-full overflow-x-hidden bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950">
          <AppSidebar />
          <SidebarInset className="flex-1 min-w-0">
            <header className="fixed top-0 left-0 right-0 z-50 flex h-16 shrink-0 items-center gap-2 px-4 border-b border-purple-700/30 bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 backdrop-blur-lg">
              <SidebarTrigger className="text-purple-100 hover:bg-purple-700/30" />
              
              {/* Smart Finance AI Logo and Brand */}
              <div className="flex items-center space-x-3 ml-4">
                <div className="relative h-12 w-12 group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 via-purple-500/30 to-blue-500/30 rounded-lg blur-md"></div>
                  <div className="relative h-12 w-12 bg-gradient-to-br from-slate-900 via-purple-900/50 to-blue-900/50 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/20">
                    <img src="/icon_48x48.png" alt="Smart Finance AI" className="h-12 w-12 object-contain" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-purple-100 font-bold text-lg">Smart Finance AI</span>
                  <span className="text-purple-200 text-xs font-medium tracking-wide">INTELLIGENT FINANCIAL OS</span>
                </div>
              </div>
              
              <div className="ml-auto flex items-center space-x-4">
                <span className="text-purple-100 text-sm">Welcome back!</span>
                <button
                  onClick={async () => {
                    await signOut();
                    setAuthRequired(true);
                    sessionStorage.removeItem('app_initialized');
                  }}
                  className="text-purple-200 hover:text-white text-sm bg-purple-800/50 hover:bg-purple-700/50 px-3 py-1 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-auto w-full pt-16">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <PWAInstall />
      
      {showSecuritySetup && (
        <SecuritySetup
          onComplete={handleSecuritySetupComplete}
          onSkip={handleSecuritySetupSkip}
        />
      )}
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
