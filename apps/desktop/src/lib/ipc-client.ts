import type {
  IpcChannel,
  IpcEventContract,
  IpcEventName,
  IpcRequest,
  IpcResponse,
} from '@ai-anywhere/shared';

/**
 * Renderer-side wrapper over the preload bridge. Unwraps Result into a
 * thrown error so React Query's error state does the work, instead of every
 * component hand-checking `.ok`.
 */
export class IpcError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'IpcError';
  }
}

type Unwrapped<C extends IpcChannel> =
  IpcResponse<C> extends { ok: true; value: infer V } | { ok: false; error: unknown } ? V : never;

export async function ipcInvoke<C extends IpcChannel>(
  channel: C,
  payload: IpcRequest<C>,
): Promise<Unwrapped<C>> {
  const response = await window.aiAnywhere.invoke(channel, payload);
  if (!response.ok) throw new IpcError(response.error.message, response.error.code);
  return response.value as Unwrapped<C>;
}

export const ipcOn = <E extends IpcEventName>(
  event: E,
  listener: (payload: IpcEventContract[E]) => void,
): (() => void) => window.aiAnywhere.on(event, listener);
