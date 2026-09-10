import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { BRANDING } from '@lipikit/shared';
import { App } from './App.js';
import { HOTKEY, POSITIONING } from './content.js';
// Bundled rather than pulled from a font CDN: same face as the app, one less
// third party in the request waterfall.
import '@fontsource-variable/inter';
// Tokens first: the shared values, then the page-only rules that use them.
import '@lipikit/ui/tokens.css';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root missing from index.html');

// index.html ships no product name: the name is not final and lives in exactly
// one file, so the title and description are set from it here.
document.title = `${BRANDING.shortName} — ${BRANDING.tagline}`;
document
  .querySelector('meta[name="description"]')
  ?.setAttribute(
    'content',
    `${BRANDING.shortName} is a free, MIT-licensed AI command layer for Windows and Ubuntu. Highlight text in any application, press ${HOTKEY}, and the answer replaces it in place. ${POSITIONING} Your own API key, no account, no telemetry.`,
  );

createRoot(container).render(
  <StrictMode>
    {/* One decision instead of a media query in every variant: framer-motion
        drops transforms and fades globally when the OS asks it to. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
