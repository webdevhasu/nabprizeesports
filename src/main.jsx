import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Capture PWA install prompt globally right on page load
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    try {
      e.preventDefault();
      window.__np_deferred_prompt = e;
      window.dispatchEvent(new CustomEvent('np_prompt_ready'));
    } catch (_) {}
  });

  // Disable long-press native popup menu across PWA (preserves form inputs)
  window.addEventListener('contextmenu', (e) => {
    try {
      const tag = e.target?.tagName?.toLowerCase();
      const isEditable = e.target?.isContentEditable;
      if (tag !== 'input' && tag !== 'textarea' && !isEditable) {
        e.preventDefault();
      }
    } catch (_) {}
  }, { passive: false });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
