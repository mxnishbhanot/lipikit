import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/AppProviders.js';
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

/**
 * Split, not statically imported: each window loads one of these two screens
 * and never the other, so the popup has no reason to parse the settings tree
 * (or settings the popup's markdown renderer) before it can paint.
 */
const Screen = isOverlay
  ? lazy(async () => ({ default: (await import('./features/overlay/components/Overlay.js')).Overlay }))
  : lazy(async () => ({ default: (await import('./app/App.js')).App }));

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      {/* The chunk is local and already on disk; a spinner here would flash. */}
      <Suspense fallback={<div className="h-screen bg-background" />}>
        <Screen />
      </Suspense>
    </AppProviders>
  </StrictMode>,
);
