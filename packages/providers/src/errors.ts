import { appError, type AppError } from '@ai-anywhere/shared';

const statusOf = (cause: unknown): number | null => {
  if (typeof cause !== 'object' || cause === null) return null;
  const status = (cause as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
};

/**
 * One mapper for every adapter and both call paths. HTTP status is the only
 * signal all seven vendors agree on, so the classification lives here rather
 * than being re-guessed per provider.
 */
export function mapProviderError(cause: unknown, status = statusOf(cause)): AppError {
  if (cause instanceof Error && (cause.name === 'AbortError' || cause.name === 'TimeoutError')) {
    return appError('CANCELLED', 'Request cancelled', cause);
  }
  if (status === 401 || status === 403) {
    return appError('PROVIDER_AUTH', 'Provider rejected the API key', cause);
  }
  if (status === 429) {
    return appError('PROVIDER_RATE_LIMIT', 'Rate limit reached; try again shortly', cause);
  }
  if (status !== null && status >= 500) {
    return appError('PROVIDER_UNAVAILABLE', `Provider is unavailable (HTTP ${status})`, cause);
  }
  if (status !== null) {
    return appError('VALIDATION', `Provider rejected the request (HTTP ${status})`, cause);
  }
  return appError('PROVIDER_UNAVAILABLE', 'Could not reach the provider', cause);
}
