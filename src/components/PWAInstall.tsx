
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    console.log('PWAInstall component mounted');
    
    // Check if it's iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);
    console.log('Is iOS:', iOS);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInstalled = localStorage.getItem('pwa-dismissed') === 'true';
    
    console.log('Is standalone:', isStandalone);
    console.log('Is dismissed:', isInstalled);

    if (!isStandalone && !isInstalled) {
      if (iOS) {
        // Show iOS install instructions after a delay
        console.log('Setting up iOS install banner');
        setTimeout(() => {
          console.log('Showing iOS install banner');
          setShowInstallBanner(true);
        }, 2000);
      } else {
        // Handle Android/Desktop install prompt
        console.log('Setting up beforeinstallprompt listener');
        const handler = (e: Event) => {
          console.log('beforeinstallprompt event fired');
          e.preventDefault();
          setDeferredPrompt(e as BeforeInstallPromptEvent);
          setShowInstallBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        
        // Fallback: show banner after delay if no prompt event
        setTimeout(() => {
          if (!deferredPrompt && !showInstallBanner) {
            console.log('No beforeinstallprompt event, showing fallback banner');
            setShowInstallBanner(true);
          }
        }, 3000);
        
        return () => window.removeEventListener('beforeinstallprompt', handler);
      }
    }
  }, [deferredPrompt, showInstallBanner]);

  const handleInstallClick = async () => {
    console.log('Install button clicked');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('Install prompt outcome:', outcome);
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallBanner(false);
      }
    }
  };

  const handleDismiss = () => {
    console.log('Dismiss button clicked');
    setShowInstallBanner(false);
    localStorage.setItem('pwa-dismissed', 'true');
  };

  console.log('PWAInstall render - showInstallBanner:', showInstallBanner);

  if (!showInstallBanner) return null;

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 backdrop-blur-xl bg-black/90 border border-white/30 rounded-2xl p-4 shadow-2xl z-[99999] animate-in slide-in-from-bottom duration-300"
      style={{ zIndex: 99999 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Download className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Install SmartFinanceAI</h3>
            <p className="text-white/70 text-xs">Get the full app experience</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/50 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isIOS ? (
        <div className="text-white/80 text-xs mb-3">
          Tap the <strong>Share</strong> button in Safari, then <strong>"Add to Home Screen"</strong>
        </div>
      ) : (
        <Button
          onClick={handleInstallClick}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg h-9 text-sm"
        >
          Install App
        </Button>
      )}
    </div>
  );
};
