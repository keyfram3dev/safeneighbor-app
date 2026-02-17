import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// PWA: Capture the install prompt event before React mounts
// This event fires when the browser determines the app meets PWA criteria
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome's mini-infobar from appearing on mobile
  e.preventDefault();
  // Store the event so it can be triggered later from Install buttons
  window.deferredPrompt = e;
});

// PWA: Track when the app is installed
window.addEventListener('appinstalled', () => {
  // Clear the stored prompt since app is now installed
  window.deferredPrompt = null;
});

// PWA: Register service worker with update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registered:', registration.scope);

        // Check for updates periodically
        setInterval(() => registration.update(), 60 * 1000);

        const onNewSW = () => {
          window.dispatchEvent(new CustomEvent('swUpdate', { detail: { registration } }));
        };

        // If already waiting (page refreshed while update pending)
        if (registration.waiting) {
          onNewSW();
        }

        // Listen for new SW finishing install
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                onNewSW();
              }
            });
          }
        });
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });

  // Reload when new SW takes over (only on updates, not first install)
  let refreshing = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing && hadController) {
      refreshing = true;
      window.location.reload();
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
