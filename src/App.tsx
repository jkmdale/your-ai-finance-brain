
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PWAInstall } from "@/components/PWAInstall";
import { SecuritySetup } from "@/components/auth/SecuritySetup";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthMethodSelection } from "@/components/auth/AuthMethodSelection";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, session, loading, hasPin, hasBiometric, signOut } = useAuth();
  const [showSecuritySetup, setShowSecuritySetup] = useState(false);
  const [showMethodSelection, setShowMethodSelection] = useState(false);
  const [hasCheckedSecurity, setHasCheckedSecurity] = useState(false);

  console.log('App render state:', { user: !!user, session: !!session, loading });

  // Handle authentication method selection after signup
  useEffect(() => {
    if (user && session && !loading && !hasCheckedSecurity) {
      const hasCompletedMethodSelection = localStorage.getItem('preferredAuthMethod');
      const hasCompletedSetup = localStorage.getItem('securitySetupCompleted');
      
      // Show method selection if user hasn't chosen a preferred method yet
      if (!hasCompletedMethodSelection && !hasCompletedSetup) {
        setShowMethodSelection(true);
      } else if (!hasCompletedSetup && !hasPin && !hasBiometric && !hasCompletedMethodSelection) {
        setShowSecuritySetup(true);
      }
      
      setHasCheckedSecurity(true);
    }
  }, [user, session, loading, hasPin, hasBiometric, hasCheckedSecurity]);

  const handleMethodSelectionComplete = () => {
    setShowMethodSelection(false);
    localStorage.setItem('securitySetupCompleted', 'true');
  };

  const handleMethodSelectionSkip = () => {
    setShowMethodSelection(false);
    localStorage.setItem('preferredAuthMethod', 'email');
    localStorage.setItem('securitySetupCompleted', 'true');
  };

  // Only show loading spinner if we're actually loading an existing session
  if (loading) {
    console.log('App showing loading state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  // Show method selection for new users
  if (showMethodSelection) {
    return (
      <AuthMethodSelection
        onComplete={handleMethodSelectionComplete}
        onSkip={handleMethodSelectionSkip}
      />
    );
  }

  console.log('Rendering main app with router');

  return (
    <BrowserRouter>
      {user && session ? (
        <SidebarProvider>
          <div className="min-h-screen flex w-full max-w-full overflow-x-hidden bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950">
            <AppSidebar />
            <SidebarInset className="flex-1 min-w-0">
              <header className="fixed top-0 left-0 right-0 z-50 flex h-16 shrink-0 items-center gap-2 px-4 border-b border-purple-700/30 bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 backdrop-blur-lg">
                <SidebarTrigger className="text-purple-100 hover:bg-purple-700/30" />
                
                {/* Smart Finance AI Logo and Brand */}
                <div className="flex items-center space-x-3 ml-4">
                  <div className="h-10 w-10">
                    <img src="/icon_48x48.png" alt="Smart Finance AI" className="h-10 w-10 object-contain" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-purple-100 font-bold text-lg leading-tight">Smart Finance AI</span>
                    <span className="text-purple-200 text-xs font-medium tracking-wide leading-tight">INTELLIGENT FINANCE OS</span>
                  </div>
                </div>
                
                <div className="ml-auto flex items-center space-x-4">
                  <button
                    onClick={async () => {
                      console.log('Signing out user');
                      await signOut();
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
      ) : (
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
      <PWAInstall />
      
      {showSecuritySetup && (
        <SecuritySetup
          onComplete={() => {
            localStorage.setItem('securitySetupCompleted', 'true');
            setShowSecuritySetup(false);
          }}
          onSkip={() => {
            localStorage.setItem('securitySetupCompleted', 'true');
            setShowSecuritySetup(false);
          }}
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
