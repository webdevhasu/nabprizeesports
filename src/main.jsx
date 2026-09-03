import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

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
