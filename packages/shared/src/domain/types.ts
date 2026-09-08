export type Platform = 'win32' | 'linux';

/** Linux only; null on Windows or when neither X11 nor Wayland is detectable. */
export type DisplayServer = 'x11' | 'wayland' | null;

export type ProviderId = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'groq' | 'ollama' | 'deepseek';

export type ActionId =
  | 'rewrite'
  | 'improve'
  | 'shorten'
  | 'expand'
  | 'fix-grammar'
  | 'translate'
  | 'summarize'
  | 'custom'
  /** Answer an inbound client message, rather than rewrite the user's own text. */
  | 'client-reply';

/** Voice a client reply is written in. The style is the only thing the user picks. */
export type ReplyStyle = 'professional' | 'friendly' | 'technical' | 'empathetic' | 'support' | 'executive';

export const REPLY_STYLES: readonly ReplyStyle[] = [
  'professional',
  'friendly',
  'technical',
  'empathetic',
  'support',
  'executive',
];

/**
 * What the popup is doing this time round. The palette is the general-purpose
 * flow; client-reply is its own hotkey and skips straight to the style picker.
 */
/**
 * Which screen the popup opens on. `quick-prompt` is the palette with one
 * command already chosen — how a prompt's own shortcut runs it: the same list
 * renders, then the command runs as soon as the selection lands.
 */
export type OverlayMode = 'palette' | 'client-reply' | 'quick-prompt';

/**
 * The model's read of an inbound client message, parsed out of the answer it
 * returns alongside the reply. Every field is best-effort: a model that
 * ignores the format costs the user the chips, never the reply.
 */
export interface ReplyAnalysis {
  /** Questions the client asked, verbatim-ish, in the order they appeared. */
  readonly questions: readonly string[];
  readonly urgency: 'low' | 'medium' | 'high' | null;
  readonly sentiment: 'positive' | 'neutral' | 'negative' | null;
  /** e.g. 'bug report', 'invoice issue'; free text, whatever the model saw. */
  readonly categories: readonly string[];
}

/**
 * Applications the context engine can recognise by name or window title.
 * Recognition only ever *adds* a suggestion, so an app that is not on this
 * list degrades to the plain command palette rather than to an error.
 */
export type KnownAppId =
  | 'slack'
  | 'jira'
  | 'confluence'
  | 'github'
  | 'gmail'
  | 'outlook'
  | 'linkedin'
  | 'vscode'
  | 'cursor'
  | 'chrome'
  | 'firefox'
  | 'discord'
  | 'teams';

/** Runtime list of the same union, for dropdowns. Keep the two in step. */
export const KNOWN_APP_IDS: readonly KnownAppId[] = [
  'slack',
  'jira',
  'confluence',
  'github',
  'gmail',
  'outlook',
  'linkedin',
  'vscode',
  'cursor',
  'chrome',
  'firefox',
  'discord',
  'teams',
];

/** What the foreground window turned out to be, plus what to offer for it. */
export interface AppContext {
  readonly appId: KnownAppId | null;
  /** Human label: 'Slack', or the raw process name when unrecognised. */
  readonly label: string;
  readonly appName: string | null;
  readonly windowTitle: string | null;
  /** OS the window was read on; null when nothing could be read at all. */
  readonly platform: Platform | null;
  /** Host of the site in a browser window; null outside browsers. */
  readonly browserDomain: string | null;
  readonly isBrowser: boolean;
  /** Command ids the palette lists first, most relevant one leading. */
  readonly suggestedCommandIds: readonly string[];
  /** When the window was read, so a stale context is recognisable as one. */
  readonly timestamp: number;
}

/**
 * A user-authored prompt. Unlike the built-in catalog these are rows, because
 * the user creates and edits them at runtime.
 */
export interface CustomPrompt {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  /** Supports {{text}}, {{selection}}, {{app}}, {{windowTitle}}, {{clipboard}}. */
  readonly template: string;
  /** Suggest this prompt first when that app is in the foreground. */
  readonly appId: KnownAppId | null;
  /**
   * Optional global shortcut that runs this prompt directly. Null means none;
   * a combination another app owns is refused and the prompt keeps saving
   * without it.
   */
  readonly shortcut: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export type Tone = 'neutral' | 'formal' | 'casual' | 'friendly' | 'confident' | 'concise';

/** Text captured from whatever app had focus, plus where it came from. */
export interface CapturedSelection {
  readonly text: string;
  readonly source: SelectionSource;
  readonly capturedAt: number;
}

export interface SelectionSource {
  /** Window title of the foreground app, when the platform can report it. */
  readonly windowTitle: string | null;
  /** Executable / process name of the foreground app. */
  readonly appName: string | null;
  /**
   * Opaque native window handle (X11 window id, Win32 HWND as decimal) used to
   * refocus the app before pasting. Null wherever the desktop refuses to say,
   * in which case replacement relies on hiding the overlay to restore focus.
   */
  readonly windowId: string | null;
  readonly platform: Platform;
}

/**
 * What this machine can actually do, resolved once at startup. The renderer
 * uses it to tell the user *why* capture is degraded instead of silently
 * falling back to "copy it yourself first".
 */
export interface PlatformCapabilities {
  readonly platform: Platform;
  readonly displayServer: DisplayServer;
  /** 'electron' | 'wl-clipboard' | 'xclip' */
  readonly clipboardBackend: string;
  /** 'nut' | 'powershell' | 'xdotool' | 'ydotool' | 'none' */
  readonly keystrokeBackend: string;
  /** False when no backend can inject Ctrl+C: user must copy manually. */
  readonly canCaptureSelection: boolean;
  /** False when no backend can inject Ctrl+V: output is copy-to-clipboard only. */
  readonly canReplaceText: boolean;
}

/** Where the overlay should appear; screen coordinates of the mouse cursor. */
export interface CursorPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Accent choices. A closed list rather than a free hex value: every accent has
 * to clear contrast against both themes, and a picker that lets someone choose
 * yellow-on-white ships an unreadable UI. The names map to `[data-accent]`
 * blocks in globals.css, which is the only place the actual colours live.
 */
export type AccentColor = 'emerald' | 'blue' | 'violet' | 'amber' | 'rose';

export const ACCENT_COLORS: readonly AccentColor[] = ['emerald', 'blue', 'violet', 'amber', 'rose'];

export interface AppSettings {
  readonly theme: 'system' | 'light' | 'dark';
  /** Tints selection, focus and primary actions. Purely cosmetic. */
  readonly accentColor: AccentColor;
  /**
   * The one shortcut that always exists: it is the only way into the popup, so
   * an empty value is rejected rather than saved.
   */
  readonly globalHotkey: string;
  /**
   * Optional shortcut: capture a client message and go straight to a reply.
   * Empty means unbound — Client Reply is still in the palette. Unset by
   * default, because most users never answer clients from the desktop.
   */
  readonly clientReplyHotkey: string;
  readonly defaultProvider: ProviderId;
  readonly defaultModel: string;
  readonly defaultTone: Tone;
  /** 0..2. Ignored by models that refuse a sampling temperature (gpt-5, o-series). */
  readonly temperature: number;
  /** Upper bound on the answer, not the prompt. */
  readonly maxTokens: number;
  /** Whole-request deadline, applied per provider call. */
  readonly requestTimeoutMs: number;
  /** Off means one non-streaming call: slower to first token, same result. */
  readonly streamingEnabled: boolean;
  readonly launchAtLogin: boolean;
  readonly historyEnabled: boolean;
  readonly historyRetentionDays: number;
  /**
   * Off by default: recording every copy is the most invasive thing the app
   * can do, so it is a deliberate opt-in rather than a default convenience.
   */
  readonly clipboardHistoryEnabled: boolean;
  /** Rows kept; the oldest are dropped past this. */
  readonly clipboardHistoryLimit: number;
  /**
   * Off by default: turning it on sends the last 20 stored interactions to the
   * provider as context, which is useful for a reply thread and a privacy
   * decision the user has to make deliberately.
   */
  readonly conversationMemoryEnabled: boolean;
  /**
   * False until the first-run wizard finishes or is skipped. Gates the main
   * window on onboarding rather than a separate flag file: it exports and
   * imports with the rest of settings, so a restored backup does not re-run
   * setup on a machine that is already configured.
   */
  readonly onboardingCompleted: boolean;
}

export interface HistoryEntry {
  readonly id: string;
  readonly action: ActionId;
  readonly providerId: ProviderId;
  readonly model: string;
  readonly input: string;
  readonly output: string;
  readonly tone: Tone | null;
  readonly appName: string | null;
  readonly createdAt: number;
}

export interface ProviderModel {
  readonly id: string;
  readonly label: string;
  readonly contextWindow: number;
}

export interface ProviderDescriptor {
  readonly id: ProviderId;
  readonly label: string;
  readonly requiresApiKey: boolean;
  /** Where to get a key; shown next to the key field in settings. */
  readonly apiKeyUrl: string | null;
  /** Base URL the adapter talks to, so diagnostics can show the endpoint. */
  readonly baseUrl: string;
  /** Static fallback list; `listModels()` replaces it when the API answers. */
  readonly models: readonly ProviderModel[];
}

/** One recorded clipboard copy. Only written while the feature is on. */
export interface ClipboardEntry {
  readonly id: string;
  readonly text: string;
  /** Foreground app at the moment of the copy, when the desktop says. */
  readonly appName: string | null;
  readonly createdAt: number;
}

/** What a favourite points at: a palette command, or a user-authored prompt. */
export type FavoriteKind = 'command' | 'prompt';

/**
 * Per-provider overrides. Absent row means "catalog defaults, enabled": the
 * table only ever holds what the user actually changed.
 */
export interface ProviderSettings {
  readonly providerId: ProviderId;
  /** Disabled providers stay configured but drop out of the pickers. */
  readonly enabled: boolean;
  /** Endpoint override: a self-hosted Ollama, a proxy, a gateway. */
  readonly baseUrl: string | null;
  /** Model to use when this provider is selected. */
  readonly defaultModel: string | null;
  readonly updatedAt: number;
}

export interface ProviderSettingsPatch {
  readonly providerId: ProviderId;
  readonly enabled?: boolean;
  readonly baseUrl?: string | null;
  readonly defaultModel?: string | null;
}

/**
 * Export/import payload. Deliberately excludes API keys: they live encrypted
 * in the OS keyring, and a plaintext key in a JSON file the user emails to
 * themselves is exactly the leak that store exists to prevent.
 */
export interface SettingsBackup {
  readonly version: number;
  readonly exportedAt: number;
  readonly appVersion: string;
  readonly settings: AppSettings;
  readonly prompts: readonly CustomPrompt[];
  readonly providers: readonly ProviderSettings[];
}
