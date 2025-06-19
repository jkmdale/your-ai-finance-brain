
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PWAInstall } from "@/components/PWAInstall";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { SecuritySetup } from "@/components/auth/SecuritySetup";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading, hasPin, hasBiometric } = useAuth();
  const [showSecuritySetup, setShowSecuritySetup] = useState(false);
  const [hasCheckedSecurity, setHasCheckedSecurity] = useState(false);

  useEffect(() => {
    // Check if user needs security setup after they're authenticated
    if (user && !loading && !hasCheckedSecurity) {
      // Show security setup if user doesn't have PIN or biometric set up
      const needsSecuritySetup = !hasPin && !hasBiometric;
      setShowSecuritySetup(needsSecuritySetup);
      setHasCheckedSecurity(true);
    }
  }, [user, loading, hasPin, hasBiometric, hasCheckedSecurity]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950">
        <Navbar />
        <div className="pt-16">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
      <PWAInstall />
      
      {showSecuritySetup && (
        <SecuritySetup
          onComplete={() => setShowSecuritySetup(false)}
          onSkip={() => setShowSecuritySetup(false)}
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
