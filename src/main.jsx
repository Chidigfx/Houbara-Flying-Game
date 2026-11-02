import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/montserrat/300.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import App from './App';
import './index.css';

// Dev helper: append ?static to disable fades/transitions (deterministic screenshots).
if (new URLSearchParams(window.location.search).has('static')) {
  const s = document.createElement('style');
  s.textContent = '*{transition:none!important}';
  document.head.appendChild(s);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
