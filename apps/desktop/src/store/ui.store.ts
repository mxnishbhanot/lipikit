import { create } from 'zustand';
import type { ActionId, Tone } from '@ai-anywhere/shared';

/**
 * Remembering the last screen is the one piece of UI state that has to outlive
 * the window, and localStorage is per-app in Electron, so it needs no IPC and
 * no settings row. A read that fails (first run, cleared data) is just 'home'.
 */
const LAST_VIEW_KEY = 'ai-anywhere:last-view';

const storedView = (): UiState['activeView'] =>
  localStorage.getItem(LAST_VIEW_KEY) === 'settings' ? 'settings' : 'home';

/**
 * Zustand holds only ephemeral UI state. Anything the main process owns
 * (settings, history, providers) belongs to React Query — two caches for the
 * same data is how stale UI bugs are born.
 */
interface UiState {
  readonly activeView: 'home' | 'settings';
  readonly draftAction: ActionId;
  readonly draftTone: Tone;
  setActiveView(view: UiState['activeView']): void;
  setDraftAction(action: ActionId): void;
  setDraftTone(tone: Tone): void;
}

export const useUiStore = create<UiState>((set) => ({
  activeView: storedView(),
  draftAction: 'rewrite',
  draftTone: 'neutral',
  setActiveView: (activeView) => {
    localStorage.setItem(LAST_VIEW_KEY, activeView);
    set({ activeView });
  },
  setDraftAction: (draftAction) => set({ draftAction }),
  setDraftTone: (draftTone) => set({ draftTone }),
}));
