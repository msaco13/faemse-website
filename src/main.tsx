import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary, { reloadOnce } from './components/ErrorBoundary';
import './fonts.css';
import './index.css';

// Vite reports a page chunk that failed to load (typically because a deploy
// replaced the hashed files under a tab that was already open). One reload
// picks up the new build; the guard keeps a broken build from looping.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnce()) {
    event.preventDefault();
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
