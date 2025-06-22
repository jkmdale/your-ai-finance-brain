
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PWAInstall } from "@/components/PWAInstall";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useState, useEffect } from "react";
import { useEncryption } from "@/hooks/useEncryption";
import { EncryptionSetup } from "@/components/auth/EncryptionSetup";
import { EncryptionUnlock } from "@/components/auth/EncryptionUnlock";
import { AlertTriangle } from "lucide-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthMethodSelection } from "@/components/auth/AuthMethodSelection";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, session, loading, signOut } = useAuth();
  const { isEncryptionReady, hasEncryptionKeys, isLoading: encryptionLoading, error: encryptionError } = useEncryption();
  const [showMethodSelection, setShowMethodSelection] = useState(false);
  const [hasCheckedMethodSelection, setHasCheckedMethodSelection] = useState(false);

  console.log('App render state:', { user: !!user, session: !!session, loading, encryptionReady: isEncryptionReady, hasKeys: hasEncryptionKeys });

  // Handle authentication method selection for new users
  useEffect(() => {
    if (user && session && !loading && !hasCheckedMethodSelection) {
      const hasCompletedMethodSelection = localStorage.getItem('preferredAuthMethod');
      const hasCompletedSetup = localStorage.getItem('securitySetupCompleted');
      
      // Show method selection only if user hasn't chosen a preferred method yet
      if (!hasCompletedMethodSelection && !hasCompletedSetup) {
        // Check if this is a new signup by looking at user creation time
        const userCreatedAt = new Date(user.created_at);
        const now = new Date();
        const timeDiff = now.getTime() - userCreatedAt.getTime();
        const isNewUser = timeDiff < 5 * 60 * 1000; // 5 minutes
        
        if (isNewUser) {
          setShowMethodSelection(true);
        }
      }
      
      setHasCheckedMethodSelection(true);
    }
  }, [user, session, loading, hasCheckedMethodSelection]);

  const handleMethodSelectionComplete = () => {
    setShowMethodSelection(false);
    localStorage.setItem('securitySetupCompleted', 'true');
  };

  const handleMethodSelectionSkip = () => {
    setShowMethodSelection(false);
    localStorage.setItem('preferredAuthMethod', 'email');
    localStorage.setItem('securitySetupCompleted', 'true');
  };

  // Show method selection for new users who just signed up
  if (showMethodSelection && user && session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
        <AuthMethodSelection
          onComplete={handleMethodSelectionComplete}
          onSkip={handleMethodSelectionSkip}
        />
      </div>
    );
  }

  // For authenticated users, handle encryption flow before showing main app
  if (user && session) {
    // Show encryption loading state
    if (encryptionLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
            <p className="text-white/70">Loading encryption...</p>
          </div>
        </div>
      );
    }

    // Show encryption error state
    if (encryptionError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Encryption Error</h3>
            <p className="text-white/70 mb-6">{encryptionError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    // Show encryption setup for new users
    if (!hasEncryptionKeys) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Secure Your Financial Data
              </h2>
              <p className="text-xl text-white/70">
                Enable end-to-end encryption to protect your financial information with bank-level security
              </p>
            </div>
            <EncryptionSetup onComplete={() => window.location.reload()} />
          </div>
        </div>
      );
    }

    // Show encryption unlock for existing users
    if (hasEncryptionKeys && !isEncryptionReady) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Welcome Back
              </h2>
              <p className="text-xl text-white/70">
                Your data is encrypted and secure. Please unlock to continue.
              </p>
            </div>
            <EncryptionUnlock onUnlock={() => window.location.reload()} />
          </div>
        </div>
      );
    }

    // All encryption checks passed, show main authenticated app
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
                      // Clear stored preferences on sign out
                      localStorage.removeItem('preferredAuthMethod');
                      localStorage.removeItem('securitySetupCompleted');
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
        <PWAInstall />
      </BrowserRouter>
    );
  }

  // Unauthenticated users see the landing page
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PWAInstall />
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
