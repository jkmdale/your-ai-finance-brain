createRoot(rootElement).render(<App />);

// ✅ Register the service worker once
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js') // ✅ your file is named sw.js
      .then((registration) => {
        console.log('SW registered:', registration)

        // ✅ Listen for updates and auto-refresh
        registration.onupdatefound = () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New content available
                toast.info('New version available. Refreshing...')
                setTimeout(() => window.location.reload(), 1000)
              }
            }
          }
        }
      })
      .catch((error) => {
        console.error('SW registration failed:', error)
      })
  })
}