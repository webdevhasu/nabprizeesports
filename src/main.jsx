import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Check immediately and periodically for a new deployed build. Once the new
// worker is ready, autoUpdate activates it and reloads the installed PWA.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Activate the new worker immediately so installed PWAs do not keep an old
    // JavaScript bundle after a deployment.
    updateSW(true).catch(() => {});
  },
  onRegisteredSW: (_swUrl, registration) => {
    if (registration) {
      registration.update().catch(() => {});
      window.setInterval(() => registration.update().catch(() => {}), 15 * 60 * 1000);
    }
  },
})

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const reloadKey = 'np_sw_reloaded_at';
    const lastReload = Number(sessionStorage.getItem(reloadKey) || 0);
    if (Date.now() - lastReload > 10_000) {
      sessionStorage.setItem(reloadKey, String(Date.now()));
      window.location.reload();
    }
  });
}

// Capture PWA install prompt globally right on page load
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__np_deferred_prompt = e;
  window.dispatchEvent(new CustomEvent('np_prompt_ready'));
});

// Disable long-press native popup menu across PWA (preserves form inputs)
window.addEventListener('contextmenu', (e) => {
  const tag = e.target?.tagName?.toLowerCase();
  const isEditable = e.target?.isContentEditable;
  if (tag !== 'input' && tag !== 'textarea' && !isEditable) {
    e.preventDefault();
  }
}, { passive: false });

import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
