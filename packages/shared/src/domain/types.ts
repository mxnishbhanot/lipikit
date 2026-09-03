export type Platform = 'win32' | 'linux';

export type ProviderId = 'openai' | 'anthropic' | 'google' | 'ollama';

export type ActionId =
  'rewrite' | 'improve' | 'shorten' | 'expand' | 'fix-grammar' | 'translate' | 'summarize' | 'custom';

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
  readonly platform: Platform;
}

export interface AppSettings {
  readonly theme: 'system' | 'light' | 'dark';
  readonly globalHotkey: string;
  readonly defaultProvider: ProviderId;
  readonly defaultModel: string;
  readonly defaultTone: Tone;
  readonly launchAtLogin: boolean;
  readonly historyEnabled: boolean;
  readonly historyRetentionDays: number;
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
  readonly models: readonly ProviderModel[];
}
