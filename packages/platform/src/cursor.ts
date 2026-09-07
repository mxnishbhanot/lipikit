import { screen } from 'electron';
import type { CursorService } from './contracts.js';

/**
 * Electron's screen module reports the pointer in DIP screen coordinates on
 * both Windows and Linux, which is exactly what BrowserWindow.setBounds
 * expects — no per-platform scaling maths needed.
 */
export function createCursorService(): CursorService {
  return {
    getCursorPoint: () => screen.getCursorScreenPoint(),
  };
}
