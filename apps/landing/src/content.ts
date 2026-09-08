import { BRANDING } from '@ai-anywhere/shared';

/**
 * Every claim the page makes, in one file, so a copy change is never a hunt
 * through JSX. Facts are kept in step with README.md by hand — the page is a
 * static build with no access to the app's runtime, and importing the provider
 * catalogue here would drag a package meant for the Electron main process into
 * a marketing bundle for seven labels.
 *
 * Nothing here restates a product name or URL: those come from
 * `@ai-anywhere/shared`'s branding config, which is the one place they live.
 */

/** The one hotkey that always exists. Rebindable, not removable. */
export const HOTKEY = 'Ctrl+Space';

export const REPO_URL = 'https://github.com/mxnish-bhanot/ai-anywhere';
export const RELEASES_URL = `${REPO_URL}/releases/latest`;

export interface NavLink {
  readonly href: string;
  readonly label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '#features', label: 'Features' },
  { href: '#everywhere', label: 'Works everywhere' },
  { href: '#providers', label: 'Providers' },
  { href: '#shortcuts', label: 'Shortcuts' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#faq', label: 'FAQ' },
];

export interface Feature {
  readonly title: string;
  readonly body: string;
  /** lucide-react icon name, resolved in the section. */
  readonly icon: 'Keyboard' | 'Replace' | 'Layers' | 'History' | 'FileCode' | 'KeyRound';
}

export const FEATURES: readonly Feature[] = [
  {
    icon: 'Keyboard',
    title: 'One hotkey, any window',
    body: `Select text anywhere on the machine and press ${HOTKEY}. The popup opens next to the cursor with your selection already captured — no copying, no switching apps, no tab to find.`,
  },
  {
    icon: 'Replace',
    title: 'Replaces the text in place',
    body: 'Accept an answer and it is pasted back over the original selection in the app you were already in. Your clipboard is snapshotted first and restored afterwards, on every path including the failures.',
  },
  {
    icon: 'Layers',
    title: 'A palette of real actions',
    body: 'Fix grammar, change tone, expand, shorten, summarise, translate, and write the things you write every week: commit messages, PR descriptions, standup updates, client replies.',
  },
  {
    icon: 'FileCode',
    title: 'Your own prompts, your own keys',
    body: 'Write a template once and give it a global shortcut of its own. Ctrl+Alt+B runs "Bug report" while Ctrl+Alt+S runs "Standup update" — straight onto the selection, no popup in between.',
  },
  {
    icon: 'History',
    title: 'Everything is on disk',
    body: 'Settings, provider overrides, history, clipboard history, favourites and prompts live in a local SQLite database, and the whole configuration exports to a single JSON file you can move to another machine.',
  },
  {
    icon: 'KeyRound',
    title: 'Keys in the OS keyring',
    body: 'API keys are encrypted by the system keyring and validated against the provider before they are stored. They never reach the database, the settings export, or the page rendering the UI.',
  },
];

export interface Step {
  readonly n: number;
  readonly title: string;
  readonly body: string;
}

/** The capture-and-replace flow, matching what the services actually do. */
export const STEPS: readonly Step[] = [
  {
    n: 1,
    title: 'Select and press',
    body: `Highlight text in any application — an editor, a browser field, a chat window, a terminal — and press ${HOTKEY}.`,
  },
  {
    n: 2,
    title: 'Pick an action',
    body: 'The palette opens at the cursor, filtered as you type. Arrow keys move, Enter runs, Ctrl+D pins the ones you use most.',
  },
  {
    n: 3,
    title: 'Keep or replace',
    body: 'Read the answer, then press Ctrl+Enter to replace the original selection, or copy it and append it below instead.',
  },
];

export interface Platform {
  readonly name: string;
  readonly detail: string;
  readonly artifacts: readonly string[];
  readonly icon: 'Windows' | 'Linux';
}

export const PLATFORMS: readonly Platform[] = [
  {
    icon: 'Windows',
    name: 'Windows',
    detail:
      'Nothing to install alongside it. Keystroke injection uses PowerShell out of the box, and the installer is per-user, so there is no admin prompt.',
    artifacts: ['NSIS installer', 'Portable .exe'],
  },
  {
    icon: 'Linux',
    name: 'Ubuntu / Linux',
    detail:
      'X11 via xdotool, Wayland via ydotool. Where the compositor will not let a client raise another window, the app says so instead of failing one action at a time.',
    artifacts: ['AppImage', '.deb'],
  },
];

/** Windows and Ubuntu are the whole target list; macOS is out of scope. */
export const PLATFORM_NOTE =
  'Built for Windows and Ubuntu/Linux. macOS is not supported — the platform seam is there, the backend is not.';

export interface Provider {
  readonly label: string;
  readonly models: string;
  /** Local models need no key and no network. */
  readonly local?: boolean;
}

export const PROVIDERS: readonly Provider[] = [
  { label: 'OpenAI', models: 'GPT-5, GPT-5 mini, GPT-5 nano' },
  { label: 'Anthropic', models: 'Claude Opus 5, Sonnet 5, Haiku 4.5' },
  { label: 'Google Gemini', models: 'Gemini 2.5 Pro, 2.5 Flash' },
  { label: 'OpenRouter', models: 'Anything OpenRouter routes' },
  { label: 'Groq', models: 'Llama 3.3 70B, Llama 3.1 8B' },
  { label: 'DeepSeek', models: 'DeepSeek V3, DeepSeek R1' },
  { label: 'Ollama', models: 'Llama 3.1, Qwen 2.5 — on your machine', local: true },
];

export const PROVIDER_NOTE =
  'Bring your own key. Every provider implements one interface, so switching is a dropdown and not a reinstall — and Ollama needs no key at all.';

export interface ShortcutRow {
  readonly keys: string;
  readonly what: string;
}

export interface ShortcutGroup {
  readonly title: string;
  readonly rows: readonly ShortcutRow[];
}

/**
 * A subset of the in-app cheatsheet (F1 in the app shows all of it). Kept
 * short on purpose: a landing page that lists forty bindings is a manual.
 */
export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    title: 'Global',
    rows: [
      { keys: HOTKEY, what: 'Capture the selection and open the palette' },
      { keys: 'Ctrl+Alt+B', what: 'Run one of your own prompts — any combination you set' },
    ],
  },
  {
    title: 'Palette',
    rows: [
      { keys: '↑ / ↓', what: 'Move through commands' },
      { keys: 'Tab / Shift+Tab', what: 'Jump a whole section' },
      { keys: 'Enter', what: 'Run the highlighted command' },
      { keys: 'Ctrl+D', what: 'Favourite the highlighted command' },
    ],
  },
  {
    title: 'Answer',
    rows: [
      { keys: 'Ctrl+Enter', what: 'Replace the original selection' },
      { keys: 'Esc', what: 'Back to the palette, then close' },
    ],
  },
  {
    title: 'Settings window',
    rows: [
      { keys: 'Ctrl+K', what: 'Command palette' },
      { keys: 'Ctrl+F', what: 'Search settings' },
      { keys: 'F1 / Ctrl+/', what: 'Every shortcut, in a sheet' },
    ],
  },
];

export interface PrivacyPoint {
  readonly title: string;
  readonly body: string;
}

export const PRIVACY_POINTS: readonly PrivacyPoint[] = [
  {
    title: 'No account, no sign-in',
    body: 'There is no server of ours to sign in to. Download it, paste a provider key, use it.',
  },
  {
    title: 'No telemetry',
    body: 'No analytics, no crash reporting, no usage pings. The app talks to the AI provider you configured and to nothing else.',
  },
  {
    title: 'Keys encrypted by the OS',
    body: 'API keys go to the system keyring — DPAPI-backed on Windows, libsecret on Linux. If the keyring is unavailable, storing a key fails: there is no plaintext fallback.',
  },
  {
    title: 'Your text goes where you point it',
    body: 'The selection is sent to the provider you chose, and history stays in a local SQLite file. Pick Ollama and nothing leaves the machine at all.',
  },
  {
    title: 'Uninstalling keeps your data',
    body: 'Settings, history and keys live in the OS user-data directory, so a reinstall finds them again. Deleting them is your call, by hand.',
  },
  {
    title: 'Source is on GitHub',
    body: 'MIT-licensed and readable end to end: the capture flow, the IPC allowlist, the keyring calls, all of it.',
  },
];

export interface Faq {
  readonly q: string;
  readonly a: string;
}

export const FAQS: readonly Faq[] = [
  {
    q: 'Do I need an API key?',
    a: 'For the hosted providers, yes — one key from whichever vendor you already pay. Ollama is the exception: point the app at your local daemon and there is no key and no bill.',
  },
  {
    q: 'Is there a macOS build?',
    a: 'No, and not soon. Windows and Ubuntu/Linux are the supported targets. macOS needs an Accessibility-API backend and the permission prompts that come with it.',
  },
  {
    q: 'Does it work in every application?',
    a: 'Capture and replacement use the same clipboard and keystroke path the OS gives every app, so anything with a normal text field works. Wayland cannot let one client raise another, so there the popup relies on focus returning when it hides — the app tells you when a session is degraded.',
  },
  {
    q: 'What does it cost?',
    a: 'Nothing. It is MIT-licensed and free. You pay your AI provider directly for what you use, at their prices, with no markup passing through us.',
  },
  {
    q: 'Why does Windows warn on first run?',
    a: 'The builds are not code-signed yet. SmartScreen flags any unsigned installer: choose More info, then Run anyway. Signing is the first item on the roadmap.',
  },
  {
    q: 'Can I change the hotkey?',
    a: `Yes. ${HOTKEY} is the default and can be rebound, but not removed — it is the only way into the popup. Two more optional global shortcuts are unbound until you set them, and every prompt template can carry one of its own.`,
  },
  {
    q: 'Does it update itself?',
    a: 'Not in 1.0. Auto-update waits on code signing, so for now a new version is a download from the releases page. Your data is untouched by reinstalling.',
  },
  {
    q: 'Where does my history live?',
    a: 'In a SQLite database in the app’s user-data directory on your own disk, alongside your settings and prompts. It never syncs anywhere, and the whole configuration exports to one JSON file.',
  },
];

export interface Download {
  readonly platform: string;
  readonly file: string;
  readonly note: string;
  readonly icon: 'Windows' | 'Linux';
}

/**
 * Artifact names are built from the version rather than typed out, because the
 * release workflow refuses to publish when the tag and the app version
 * disagree — so the version is the one variable and these names follow it.
 */
const V = BRANDING.version;

export const DOWNLOADS: readonly Download[] = [
  {
    icon: 'Windows',
    platform: 'Windows',
    file: `AI-Anywhere-${V}-win-x64.exe`,
    note: 'NSIS installer. Per-user, no admin prompt.',
  },
  {
    icon: 'Windows',
    platform: 'Windows',
    file: `AI-Anywhere-${V}-win-x64-portable.exe`,
    note: 'One file, no installer, no registry writes.',
  },
  {
    icon: 'Linux',
    platform: 'Linux',
    file: `AI-Anywhere-${V}-linux-x86_64.AppImage`,
    note: 'chmod +x and run. No package manager, no root.',
  },
  {
    icon: 'Linux',
    platform: 'Linux',
    file: `AI-Anywhere-${V}-linux-amd64.deb`,
    note: 'sudo apt install ./the-file.deb — pulls its deps in.',
  },
];

export const DOWNLOAD_NOTE = `Version ${V} · unsigned builds · Windows 10+ and Ubuntu 22.04+`;

export const FOOTER_LINKS: readonly { readonly heading: string; readonly links: readonly NavLink[] }[] = [
  {
    heading: 'Product',
    links: [
      { href: '#features', label: 'Features' },
      { href: '#shortcuts', label: 'Shortcuts' },
      { href: '#download', label: 'Download' },
      { href: '#faq', label: 'FAQ' },
    ],
  },
  {
    heading: 'Project',
    links: [
      { href: REPO_URL, label: 'Source on GitHub' },
      { href: RELEASES_URL, label: 'Releases' },
      { href: `${REPO_URL}/issues`, label: 'Report an issue' },
      { href: `${REPO_URL}/blob/main/README.md`, label: 'Documentation' },
    ],
  },
];
