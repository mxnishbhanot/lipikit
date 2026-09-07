import type { ProviderDescriptor, ProviderId, ProviderModel, Result } from '@ai-anywhere/shared';

export interface GenerateTextRequest {
  readonly model: string;
  readonly system: string;
  readonly prompt: string;
  /** Dropped for models that reject a sampling temperature (gpt-5, o-series). */
  readonly temperature?: number;
  readonly maxTokens?: number;
  /** Whole-call deadline. Adapters turn it into an abort, not a dangling promise. */
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

export interface TextChunk {
  readonly delta: string;
}

export interface GeneratedText {
  readonly text: string;
  readonly model: string;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
}

/**
 * The only surface a feature sees. Adding a vendor means one new file
 * implementing this — no switch statement anywhere else in the app.
 */
export interface AiProvider {
  readonly descriptor: ProviderDescriptor;
  generateText(request: GenerateTextRequest): Promise<Result<GeneratedText>>;
  /**
   * Streaming is the primary path in the UI. It *throws* rather than yielding
   * a Result: an async iterable cannot report a mid-stream failure any other
   * way, and callers already need a try/catch around the loop. Use
   * `mapProviderError` on whatever comes out.
   */
  streamText(request: GenerateTextRequest): AsyncIterable<TextChunk>;
  /** Live model list; adapters fall back to the static catalog on failure. */
  listModels(): Promise<Result<readonly ProviderModel[]>>;
  /**
   * Probe a candidate key without storing it. Omit the argument to validate
   * the key already in the keyring.
   */
  validateKey(apiKey?: string): Promise<Result<void>>;
  /** Cheap reachability/credential probe for the settings screen. */
  healthCheck(): Promise<Result<void>>;
}

/** Credentials never touch the DB or renderer; only ids cross IPC. */
export interface ApiKeyStore {
  get(providerId: ProviderId): Promise<string | null>;
  set(providerId: ProviderId, apiKey: string): Promise<Result<void>>;
  has(providerId: ProviderId): Promise<boolean>;
  delete(providerId: ProviderId): Promise<void>;
}

/** Injected so adapters are testable without a network or a vendor SDK mock. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ProviderDeps {
  readonly keys: ApiKeyStore;
  /** Defaults to global fetch. */
  readonly fetch?: FetchLike;
  /** Per-provider endpoint override (Ollama host, a proxy, a gateway). */
  readonly baseUrls?: Partial<Record<ProviderId, string>>;
}

export interface AiProviderFactory {
  readonly id: ProviderId;
  readonly descriptor: ProviderDescriptor;
  create(deps: ProviderDeps): AiProvider;
}

export interface ProviderRegistry {
  descriptors(): readonly ProviderDescriptor[];
  register(factory: AiProviderFactory): void;
  get(providerId: ProviderId): Result<AiProvider>;
}
