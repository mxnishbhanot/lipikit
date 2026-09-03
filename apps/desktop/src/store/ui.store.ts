import { create } from 'zustand';
import type { ActionId, Tone } from '@ai-anywhere/shared';

/**
 * Zustand holds only ephemeral UI state. Anything the main process owns
 * (settings, history, providers) belongs to React Query — two caches for the
 * same data is how stale UI bugs are born.
 */
interface UiState {
  readonly activeView: 'home' | 'settings' | 'history';
  readonly draftAction: ActionId;
  readonly draftTone: Tone;
  setActiveView(view: UiState['activeView']): void;
  setDraftAction(action: ActionId): void;
  setDraftTone(tone: Tone): void;
}

export const useUiStore = create<UiState>((set) => ({
  activeView: 'home',
  draftAction: 'rewrite',
  draftTone: 'neutral',
  setActiveView: (activeView) => set({ activeView }),
  setDraftAction: (draftAction) => set({ draftAction }),
  setDraftTone: (draftTone) => set({ draftTone }),
}));
