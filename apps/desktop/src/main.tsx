import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.js';
import { AppProviders } from './app/AppProviders.js';
import { Overlay } from './features/overlay/components/Overlay.js';
// Bundled, not fetched: the renderer has no network access to a font CDN and
// a missing webfont would fall back mid-session.
import '@fontsource-variable/inter';
import './styles/globals.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root missing from index.html');

/**
 * Two windows, one bundle, one hash. A router would be three dependencies and
 * a provider for a choice between exactly two screens that never navigate to
 * each other — main creates each window with the hash it wants.
 */
const isOverlay = window.location.hash.startsWith('#/overlay');
// The overlay's BrowserWindow is transparent so its rounded corners show; an
// opaque body would paint a square behind them.
document.body.classList.toggle('overlay', isOverlay);

createRoot(container).render(
  <StrictMode>
    <AppProviders>{isOverlay ? <Overlay /> : <App />}</AppProviders>
  </StrictMode>,
);
