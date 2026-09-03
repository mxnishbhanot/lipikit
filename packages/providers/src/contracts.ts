import type { ProviderDescriptor, ProviderId, Result } from '@ai-anywhere/shared';

export interface CompletionRequest {
  readonly model: string;
  readonly system: string;
  readonly prompt: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly signal?: AbortSignal;
}

export interface CompletionChunk {
  readonly delta: string;
}

export interface CompletionResult {
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
  /** Cheap reachability/credential probe for the settings screen. */
  healthCheck(): Promise<Result<void>>;
  complete(request: CompletionRequest): Promise<Result<CompletionResult>>;
  /** Streaming is the primary path in the UI; non-streaming is the fallback. */
  stream(request: CompletionRequest): AsyncIterable<CompletionChunk>;
}

/** Credentials never touch the DB or renderer; only ids cross IPC. */
export interface ApiKeyStore {
  get(providerId: ProviderId): Promise<string | null>;
  set(providerId: ProviderId, apiKey: string): Promise<Result<void>>;
  has(providerId: ProviderId): Promise<boolean>;
  delete(providerId: ProviderId): Promise<void>;
}

export interface ProviderRegistry {
  descriptors(): readonly ProviderDescriptor[];
  register(factory: AiProviderFactory): void;
  get(providerId: ProviderId): Result<AiProvider>;
}

export interface AiProviderFactory {
  readonly id: ProviderId;
  readonly descriptor: ProviderDescriptor;
  create(deps: { keys: ApiKeyStore }): AiProvider;
}
