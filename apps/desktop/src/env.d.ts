/// <reference types="vite/client" />
import type { LipiKitBridge } from '@lipikit/shared';

declare global {
  interface Window {
    /** Injected by the preload script; the renderer's only native surface. */
    readonly lipikit: LipiKitBridge;
  }
}
