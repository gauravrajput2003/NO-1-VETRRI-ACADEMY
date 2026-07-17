import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ─── PWA: Capture beforeinstallprompt ────────────────────────────────────────
window.__pwaPrompt = null;
window.__showPWA = false;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  // Only show if not already dismissed
  if (!localStorage.getItem('pwa-dismissed')) {
    window.__pwaPrompt = e;
    window.__showPWA = true;
    // Force a re-render by dispatching a custom event
    window.dispatchEvent(new Event('pwa-ready'));
  }
});

// ─── Register Service Worker ──────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('✅ SW registered:', reg.scope);
      })
      .catch((err) => {
        console.log('❌ SW registration failed:', err);
      });
  });
}

// ─── Render App ───────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
