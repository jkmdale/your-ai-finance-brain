import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { toast } from 'sonner';

// Define proper type for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);

// ✅ Register the correct service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                toast.info('New version available. Refreshing...');
                setTimeout(() => window.location.reload(), 1000);
              }
            };
          }
        };
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
      });
  });
}

// ✅ Prompt user to install app manually
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;

  toast.info('Add SmartFinanceAI to your home screen', {
    action: {
      label: 'Install',
      onClick: () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.finally(() => {
            deferredPrompt = null;
          });
        }
      }
    }
  });
});