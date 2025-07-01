// src/main.tsx

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);

// ✅ Register the correct service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js') // <-- 🔁 updated from '/service-worker.js'
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
      });
  });
}