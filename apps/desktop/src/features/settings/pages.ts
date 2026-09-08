import {
  Clock,
  Cpu,
  Info,
  KeyRound,
  Keyboard,
  MessageSquareWarning,
  Palette,
  Settings2,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

/**
 * The ten settings pages. This lives outside the layout because three things
 * need it now: the sidebar, the command palette, and the UI store's validation
 * of the page it remembered — a copy in any of them is a list that goes stale.
 *
 * `keywords` is what makes the search box worth having: someone looking for
 * "api key" or "telemetry" does not know which of ten pages owns it, and a
 * filter that only matched the ten titles would tell them nothing they cannot
 * already see in the sidebar.
 */
export const SETTINGS_PAGES = [
  {
    name: 'General',
    icon: Settings2,
    keywords: 'tone streaming timeout launch login startup backup import export',
  },
  { name: 'Appearance', icon: Palette, keywords: 'theme dark light accent colour color' },
  { name: 'Providers', icon: KeyRound, keywords: 'api key openai anthropic endpoint keyring health' },
  { name: 'Models', icon: Cpu, keywords: 'model temperature tokens default provider' },
  { name: 'Shortcuts', icon: Keyboard, keywords: 'hotkey keybinding global accelerator keyboard' },
  { name: 'Prompt Templates', icon: Sparkles, keywords: 'prompts custom template variables' },
  { name: 'History', icon: Clock, keywords: 'history retention entries delete log' },
  { name: 'Privacy', icon: ShieldCheck, keywords: 'clipboard telemetry memory delete data' },
  {
    name: 'Feedback',
    icon: MessageSquareWarning,
    keywords: 'bug report feature request issue github logs diagnostics screenshot support beta',
  },
  { name: 'About', icon: Info, keywords: 'version build platform capabilities quit' },
] as const satisfies readonly { name: string; icon: LucideIcon; keywords: string }[];

export type SettingsPageName = (typeof SETTINGS_PAGES)[number]['name'];

export type SettingsPage = (typeof SETTINGS_PAGES)[number];

export const isSettingsPageName = (value: unknown): value is SettingsPageName =>
  SETTINGS_PAGES.some((entry) => entry.name === value);

/** Case-insensitive match over name plus keywords; an empty query matches all. */
export function filterSettingsPages(query: string): readonly SettingsPage[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return SETTINGS_PAGES;
  return SETTINGS_PAGES.filter((entry) => `${entry.name} ${entry.keywords}`.toLowerCase().includes(needle));
}
