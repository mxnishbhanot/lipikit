/// <reference types="vite/client" />
import type { AiAnywhereBridge } from '@ai-anywhere/shared';

declare global {
  interface Window {
    /** Injected by the preload script; the renderer's only native surface. */
    readonly aiAnywhere: AiAnywhereBridge;
  }
}
