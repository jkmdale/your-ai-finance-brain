import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppSecurityProvider } from "@/hooks/useAppSecurity";
import { PWAInstall } from "@/components/PWAInstall";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function useNetworkToasts() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      toast.success('Back online ✅')
    }
    const handleOffline = () => {
      setOnline(false)
      toast.warning('You are offline ⚠️')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}

// ✅ FIXED: PWA visibility handling for mobile tab resumption and auth state recovery
function usePWAVisibilityHandling() {
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // App became visible - check auth state
        if (import.meta.env.DEV) {
          console.log('📱 App became visible - checking auth state');
        }
        
        try {
          // Refresh auth state when app becomes visible
          await supabase.auth.getSession();
          
          // Check if user was authenticated but session expired
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            // Try to refresh session
            await supabase.auth.refreshSession();
          }
        } catch (error) {
          console.error('❌ Error refreshing auth state on visibility change:', error);
        }
      }
    };

    // Handle PWA app state changes
    const handleAppStateChange = () => {
      if (import.meta.env.DEV) {
        console.log('📱 PWA app state changed');
      }
      handleVisibilityChange();
    };

    // Listen for visibility changes (mobile tab switches)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for PWA app state changes
    window.addEventListener('focus', handleAppStateChange);
    window.addEventListener('pageshow', handleAppStateChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleAppStateChange);
      window.removeEventListener('pageshow', handleAppStateChange);
    };
  }, []);
}

const App = () => {
  useNetworkToasts()
  usePWAVisibilityHandling() // ✅ FIXED: Handle PWA/mobile scenarios

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AppSecurityProvider>
              <Toaster />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </AppSecurityProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
      <PWAInstall />
    </>
  );
};

export default App;