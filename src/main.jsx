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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
