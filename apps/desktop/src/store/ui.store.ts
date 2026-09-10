import { create } from 'zustand';
import type { ActionId, Tone } from '@lipikit/shared';
import { isSettingsPageName, type SettingsPageName } from '../features/settings/pages.js';

/**
 * Remembering the last screen is the one piece of UI state that has to outlive
 * the window, and localStorage is per-app in Electron, so it needs no IPC and
 * no settings row. A read that fails (first run, cleared data) is just 'home'.
 */
const LAST_VIEW_KEY = 'lipikit:last-view';
const LAST_PAGE_KEY = 'lipikit:last-settings-page';

const storedView = (): UiState['activeView'] =>
  localStorage.getItem(LAST_VIEW_KEY) === 'settings' ? 'settings' : 'home';

/** A page name no longer in SETTINGS_PAGES falls back rather than rendering nothing. */
const storedPage = (): SettingsPageName => {
  const saved = localStorage.getItem(LAST_PAGE_KEY);
  return isSettingsPageName(saved) ? saved : 'General';
};

/**
 * Zustand holds only ephemeral UI state. Anything the main process owns
 * (settings, history, providers) belongs to React Query — two caches for the
 * same data is how stale UI bugs are born.
 */
interface UiState {
  readonly activeView: 'home' | 'settings';
  /**
   * Which of the nine settings pages is open. It lives here rather than in the
   * settings layout because the command palette navigates to a page too, and
   * two owners of "which page" is how a palette entry that does nothing
   * happens.
   */
  readonly settingsPage: SettingsPageName;
  readonly draftAction: ActionId;
  readonly draftTone: Tone;
  setActiveView(view: UiState['activeView']): void;
  setSettingsPage(page: SettingsPageName): void;
  setDraftAction(action: ActionId): void;
  setDraftTone(tone: Tone): void;
}

export const useUiStore = create<UiState>((set) => ({
  activeView: storedView(),
  settingsPage: storedPage(),
  draftAction: 'rewrite',
  draftTone: 'neutral',
  setActiveView: (activeView) => {
    localStorage.setItem(LAST_VIEW_KEY, activeView);
    set({ activeView });
  },
  setSettingsPage: (settingsPage) => {
    localStorage.setItem(LAST_PAGE_KEY, settingsPage);
    set({ settingsPage });
  },
  setDraftAction: (draftAction) => set({ draftAction }),
  setDraftTone: (draftTone) => set({ draftTone }),
}));
