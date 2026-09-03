/**
 * Explicit result type. Errors that cross the IPC boundary must be data, not
 * exceptions: an Error instance does not survive structured cloning intact.
 */
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E = AppError> = { readonly ok: false; readonly error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export type AppErrorCode =
  | 'UNKNOWN'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'PROVIDER_AUTH'
  | 'PROVIDER_RATE_LIMIT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PLATFORM_UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'CANCELLED';

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly cause?: string;
}

const describe = (cause: unknown): string => {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'object' && cause !== null) return JSON.stringify(cause);
  return String(cause);
};

export const appError = (code: AppErrorCode, message: string, cause?: unknown): AppError => ({
  code,
  message,
  ...(cause === undefined ? {} : { cause: describe(cause) }),
});
