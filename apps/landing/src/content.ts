import { BRANDING } from '@lipikit/shared';

/**
 * Every claim the page makes, in one file, so a copy change is never a hunt
 * through JSX. Facts are kept in step with README.md by hand — the page is a
 * static build with no access to the app's runtime, and importing the provider
 * catalogue here would drag a package meant for the Electron main process into
 * a marketing bundle for seven labels.
 *
 * Nothing here restates a product name or URL: those come from
 * `@lipikit/shared`'s branding config, which is the one place they live.
 */

/** The one hotkey that always exists. Rebindable, not removable. */
export const HOTKEY = 'Ctrl+Space';

export const REPO_URL = 'https://github.com/mxnishbhanot/lipikit';
export const RELEASES_URL = `${REPO_URL}/releases/latest`;

/**
 * The hero, as copy rather than as JSX. The promise is the workflow, not the
 * technology: what the reader stops doing (leaving the app they are in) comes
 * before what the product is (a command layer over their own AI account).
 */
export const HERO = {
  /** Split so the second half can carry the accent colour. */
  headline: 'Stop switching tabs.',
  headlineAccent: 'Start working.',
  sub: `Select text anywhere, press ${HOTKEY}, and the rewrite replaces it in place. The AI command layer for Windows and Ubuntu — on your own API key.`,
  /** One line under the buttons: the three facts that decide the download. */
  note: 'Windows and Ubuntu · your own API key · no account, no telemetry, no subscription',
} as const;

/** Secondary positioning line, used under the hero and in the meta description. */
export const POSITIONING =
  'Bring GPT, Claude, Gemini and OpenRouter into Slack, VS Code, Gmail, Jira and everything else you already have open.';

export interface NavLink {
  readonly href: string;
  readonly label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '#workflows', label: 'Workflows' },
  { href: '#who', label: "Who it's for" },
  { href: '#compare', label: 'Compare' },
  { href: '#byok', label: 'Your own key' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#roadmap', label: 'Roadmap' },
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

/** Kept in step by hand with docs/FAQ.md, which is the longer version. */
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
    q: 'Do I need ChatGPT Plus?',
    a: 'No. A Plus subscription buys you the ChatGPT web app, which is not what this talks to. What it needs is an API key from a provider — OpenAI, Anthropic, Google or OpenRouter — billed per token, which for this kind of use is usually cents a day rather than a monthly fee. Or run Ollama locally and pay nothing at all.',
  },
  {
    q: 'Why bring your own key instead of a subscription?',
    a: 'Because it keeps the price honest and the choice yours: you pay the vendor directly at their prices, you pick the model per job, and switching provider is a dropdown rather than a cancellation. It also means there is no server of ours between you and the model — which is what makes the privacy claims on this page possible in the first place.',
  },
  {
    q: 'Do you store my prompts?',
    a: 'We never see them. The selection goes from your machine to the provider you configured, and the answer comes back the same way. What you accept is written to a SQLite file on your own disk so you can find it again — history is yours to keep, clear or switch off on the Privacy page.',
  },
  {
    q: 'Where exactly are my API keys stored?',
    a: 'In the OS keyring: DPAPI-backed on Windows, libsecret on Linux. They are validated against the provider before being stored, and they never reach the database, the settings export or the window rendering the UI. If the keyring is unavailable, saving a key fails — there is no plaintext fallback.',
  },
  {
    q: 'Does it work offline?',
    a: 'The app opens, the palette works and your history stays readable, but a hosted provider needs the network and the popup says so instead of hanging. Point it at Ollama on your own machine and the whole flow works with the network unplugged.',
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
    file: `LipiKit-${V}-win-x64.exe`,
    note: 'NSIS installer. Per-user, no admin prompt.',
  },
  {
    icon: 'Windows',
    platform: 'Windows',
    file: `LipiKit-${V}-win-x64-portable.exe`,
    note: 'One file, no installer, no registry writes.',
  },
  {
    icon: 'Linux',
    platform: 'Linux',
    file: `LipiKit-${V}-linux-x86_64.AppImage`,
    note: 'chmod +x and run. No package manager, no root.',
  },
  {
    icon: 'Linux',
    platform: 'Linux',
    file: `LipiKit-${V}-linux-amd64.deb`,
    note: 'sudo apt install ./the-file.deb — pulls its deps in.',
  },
];

export const DOWNLOAD_NOTE = `Version ${V} · unsigned builds · Windows 10+ and Ubuntu 22.04+`;

export const FOOTER_LINKS: readonly { readonly heading: string; readonly links: readonly NavLink[] }[] = [
  {
    heading: 'Product',
    links: [
      { href: '#workflows', label: 'Workflows' },
      { href: '#who', label: "Who it's for" },
      { href: '#compare', label: 'Compare' },
      { href: '#shortcuts', label: 'Shortcuts' },
      { href: '#download', label: 'Download' },
    ],
  },
  {
    heading: 'Project',
    links: [
      { href: REPO_URL, label: 'Source on GitHub' },
      { href: RELEASES_URL, label: 'Releases' },
      { href: `${REPO_URL}/blob/main/README.md`, label: 'Documentation' },
      { href: `${REPO_URL}/blob/main/docs/FAQ.md`, label: 'FAQ' },
      { href: `${REPO_URL}/blob/main/docs/PRIVACY.md`, label: 'Privacy' },
      { href: `${REPO_URL}/blob/main/LICENSE`, label: 'MIT licence' },
    ],
  },
  {
    heading: 'Beta',
    links: [
      { href: '#roadmap', label: 'Roadmap' },
      { href: `${REPO_URL}/issues/new?labels=bug`, label: 'Report a bug' },
      { href: `${REPO_URL}/issues/new?labels=enhancement`, label: 'Request a feature' },
      { href: `${REPO_URL}/discussions`, label: 'Discussions' },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Who it is for                                                              */
/* -------------------------------------------------------------------------- */

export interface Persona {
  readonly role: string;
  readonly body: string;
  /** Applications this person already has open all day. */
  readonly apps: readonly string[];
  /** Commands from the app's own catalog, named as the job they do. */
  readonly jobs: readonly string[];
  readonly icon: 'Code' | 'Compass' | 'Bug' | 'Users';
}

/**
 * Four readers, in the order the product serves them. Every job listed here
 * is a command that ships in the palette — a persona card promising something
 * the app cannot do is the fastest way to lose the install.
 */
export const PERSONAS: readonly Persona[] = [
  {
    icon: 'Code',
    role: 'Developers',
    body: 'The tab you keep switching to is the one where you paste a stack trace and ask what it means. That round trip is the thing this removes.',
    apps: ['VS Code', 'GitHub', 'Terminal', 'Jira', 'Chrome'],
    jobs: ['Explain a stack trace', 'PR description', 'Commit message', 'Release notes'],
  },
  {
    icon: 'Compass',
    role: 'Product managers',
    body: 'Half the day is turning a messy thread into something a team can act on. The selection is already in front of you; the rewrite lands back in the same field.',
    apps: ['Slack', 'Jira', 'Confluence', 'Gmail'],
    jobs: ['Jira comment', 'Manager update', 'Summarise', 'Follow-up'],
  },
  {
    icon: 'Bug',
    role: 'QA engineers',
    body: 'A bug report written from a log line is a template with the details filled in. Save it once as your own prompt and give it a shortcut.',
    apps: ['Jira', 'Terminal', 'Chrome DevTools'],
    jobs: ['Explain', 'Concise', 'Bug report (your own prompt)', 'Standup update'],
  },
  {
    icon: 'Users',
    role: 'Recruiters and support',
    body: 'Reply in the tone the thread needs without leaving the thread. The client-reply command reads the message first, then answers it.',
    apps: ['Gmail', 'LinkedIn', 'Outlook', 'Slack'],
    jobs: ['Client reply', 'Professional', 'Translate', 'Email'],
  },
];

/* -------------------------------------------------------------------------- */
/* Workflow demos                                                             */
/* -------------------------------------------------------------------------- */

export interface WorkflowDemo {
  readonly app: string;
  /** What the reader would have highlighted. */
  readonly before: string;
  /** The palette row they press Enter on. */
  readonly command: string;
  /** What replaces the selection. */
  readonly after: string;
  /** Why the palette offered that command first. */
  readonly detected: string;
  readonly icon: 'MessageSquare' | 'GitPullRequest' | 'Terminal' | 'Ticket';
}

/**
 * Four before-and-afters. The command names are real palette rows and the
 * detected labels are real context-engine rules, so the story on the page is
 * the story in the app.
 */
export const WORKFLOW_DEMOS: readonly WorkflowDemo[] = [
  {
    icon: 'MessageSquare',
    app: 'Slack',
    detected: 'Slack detected · Slack Reply offered first',
    before:
      'hey all — payment retry job was stuck since friday, pushed a fix, its draining the queue now, should be clear in an hour, sorry for the noise',
    command: 'Slack Reply',
    after:
      'Heads up: the payment retry job had been stuck since Friday. A fix is deployed and the queue is draining now — expect it clear within the hour. Apologies for the noise.',
  },
  {
    icon: 'GitPullRequest',
    app: 'GitHub',
    detected: 'GitHub detected · PR Description offered first',
    before:
      'moved the retry backoff into the queue worker, added a cap so it stops at 5 tries, tests for the cap, also fixed the log line that printed undefined',
    command: 'PR Description',
    after:
      'Moves retry backoff into the queue worker and caps attempts at five.\n\n- Backoff now lives with the worker instead of the caller\n- Attempts capped at 5, then the job is dead-lettered\n- Fixes a log line that printed `undefined`\n\nTesting: unit tests cover the cap; drained a staging queue of 2k jobs.',
  },
  {
    icon: 'Terminal',
    app: 'VS Code',
    detected: 'VS Code detected · Explain offered first',
    before: "TypeError: Cannot read properties of undefined (reading 'rows') at QueueWorker.drain",
    command: 'Explain',
    after:
      '`QueueWorker.drain` is reading `.rows` from something that is undefined — the query result never arrived, most likely because the call was not awaited or it returned early on an error path. Check what `drain` assigns before that line.',
  },
  {
    icon: 'Ticket',
    app: 'Jira',
    detected: 'Jira detected · Jira Comment offered first',
    before: 'still broken on staging, retried twice, waiting on infra for the queue perms',
    command: 'Jira Comment',
    after:
      '*Status:* blocked\n*What changed:* retried twice on staging, same failure.\n*Blocker:* queue permissions — waiting on infra.',
  },
];

/* -------------------------------------------------------------------------- */
/* Comparison                                                                 */
/* -------------------------------------------------------------------------- */

/** A cell is a yes, a no, or a qualified yes that needs its own words. */
export type Cell = true | false | string;

export interface ComparisonRow {
  readonly feature: string;
  /** Indexed by `COMPARISON_PRODUCTS`, same order. */
  readonly cells: readonly Cell[];
}

export const COMPARISON_PRODUCTS: readonly string[] = [
  'LipiKit',
  'ChatGPT in a browser',
  'Grammarly',
  'Raycast AI',
  'TypingMind',
];

/**
 * Kept narrow and hedged on purpose: every row is something a reader can check
 * in an afternoon, and anything that depends on a plan or a beta says so
 * rather than claiming a clean win. Vendors move — `COMPARISON_NOTE` dates the
 * table and points at their own pages.
 */
export const COMPARISON_ROWS: readonly ComparisonRow[] = [
  {
    feature: 'Runs on the text in any app, in place',
    cells: [true, false, 'In supported editors', 'On the selection, via the launcher', false],
  },
  { feature: 'Windows build', cells: [true, true, true, 'In beta', true] },
  { feature: 'Ubuntu / Linux build', cells: [true, 'Browser only', false, false, 'Browser or Electron'] },
  { feature: 'Use your own API key', cells: [true, false, false, 'On the paid plan', true] },
  { feature: 'Several providers behind one UI', cells: [true, false, false, true, true] },
  {
    feature: 'No subscription to the app itself',
    cells: [true, 'Free tier', 'Free tier', false, 'One-off licence'],
  },
  { feature: 'No account required', cells: [true, false, false, false, 'Local use'] },
  { feature: 'Telemetry off by default', cells: [true, false, false, false, 'Self-hosted'] },
  { feature: 'Adapts the prompt to the app you are in', cells: [true, false, false, false, false] },
  { feature: 'Source you can read', cells: ['MIT', false, false, false, 'Partly'] },
];

export const COMPARISON_NOTE =
  'Compiled from the vendors’ own public pages and checked by hand; plans and platform support change, so treat a row as a prompt to go and look rather than as a promise. Nothing here says these tools are bad at what they are for — they are simply not a command layer over the app you already have open.';

/* -------------------------------------------------------------------------- */
/* Bring your own key                                                         */
/* -------------------------------------------------------------------------- */

export interface ByokCard {
  readonly label: string;
  readonly models: string;
  readonly billing: string;
}

/** The four the first-run wizard offers. The rest are on the Providers list. */
export const BYOK_CARDS: readonly ByokCard[] = [
  { label: 'OpenAI', models: 'GPT-5, GPT-5 mini, GPT-5 nano', billing: 'Billed by OpenAI, per token' },
  {
    label: 'Anthropic',
    models: 'Claude Opus 5, Sonnet 5, Haiku 4.5',
    billing: 'Billed by Anthropic, per token',
  },
  { label: 'Google Gemini', models: 'Gemini 2.5 Pro, 2.5 Flash', billing: 'Billed by Google, per token' },
  {
    label: 'OpenRouter',
    models: 'One key, most models',
    billing: 'Billed by OpenRouter, per token',
  },
];

export const BYOK_POINTS: readonly PrivacyPoint[] = [
  {
    title: 'You pay the provider, not us',
    body: 'There is no subscription, no credit pack and no markup in the middle. Whatever your key costs at the vendor’s prices is the whole bill.',
  },
  {
    title: 'The key never leaves your machine',
    body: 'It goes into the OS keyring — DPAPI on Windows, libsecret on Linux — and is validated against the provider before it is stored. It is not in the database, the settings export, or the renderer.',
  },
  {
    title: 'Switching is a dropdown',
    body: 'Every provider implements the same interface, so the popup’s footer switches vendor mid-session. Three more are wired up beyond the four above, and Ollama needs no key at all.',
  },
];

/* -------------------------------------------------------------------------- */
/* Roadmap                                                                    */
/* -------------------------------------------------------------------------- */

export interface RoadmapColumn {
  readonly heading: string;
  readonly note: string;
  readonly items: readonly string[];
  /** 'now' is shipped; the other two are not promises with dates on them. */
  readonly state: 'now' | 'next' | 'later';
}

/**
 * The line between shipped and planned is the whole point of this section: a
 * roadmap that reads like a feature list is how a beta loses trust on day one.
 */
export const ROADMAP: readonly RoadmapColumn[] = [
  {
    state: 'now',
    heading: 'In 1.0',
    note: 'Shipped, in the build you can download today.',
    items: [
      'Global hotkey capture and in-place replace',
      'Command palette with favourites and recents',
      'Context engine for Slack, Jira, GitHub, Gmail, VS Code and browsers',
      'Seven providers, your own keys, streaming answers',
      'Your own prompt templates, each with its own shortcut',
      'Local SQLite history, clipboard history, JSON export',
    ],
  },
  {
    state: 'next',
    heading: 'Coming soon',
    note: 'Being built next. No dates until they are in a release.',
    items: [
      'Code-signed installers, then auto-update',
      'Screenshot OCR: capture a region, run a command on the text',
      'Voice dictation into the popup',
      'Workflow automation: chain two commands into one shortcut',
    ],
  },
  {
    state: 'later',
    heading: 'Later',
    note: 'Wanted, not started. Ordered by how often it is asked for.',
    items: [
      'PDF assistant: ask questions of a local document',
      'Per-app prompt profiles you can share',
      'A macOS build — needs an Accessibility-API backend',
    ],
  },
];
