import { clipboard } from 'electron';
import type { ClipboardService } from './contracts.js';

/** Electron's clipboard is identical on Win32 and Linux — one implementation. */
export function createElectronClipboardService(): ClipboardService {
  return {
    readText: () => clipboard.readText(),
    writeText: (text) => clipboard.writeText(text),
    async withPreservedClipboard(fn) {
      const previous = clipboard.readText();
      try {
        return await fn();
      } finally {
        clipboard.writeText(previous);
      }
    },
  };
}
