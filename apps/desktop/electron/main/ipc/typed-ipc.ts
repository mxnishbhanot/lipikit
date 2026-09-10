import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { appError, err, type IpcChannel, type IpcHandlerMap, type Logger } from '@lipikit/shared';

/**
 * The only place ipcMain.handle is called. Every handler gets:
 *  - a compile-time-checked payload/response pair (IpcHandlerMap),
 *  - a sender check, so a hijacked frame cannot drive the main process,
 *  - a catch-all that converts a throw into an AppError instead of an
 *    unhandled rejection that the renderer sees as a hung promise.
 */
export function registerIpcHandlers(handlers: IpcHandlerMap, logger: Logger): () => void {
  const scoped = logger.child('ipc');
  const channels = Object.keys(handlers) as IpcChannel[];

  for (const channel of channels) {
    const handler = handlers[channel];
    ipcMain.handle(channel, async (event: IpcMainInvokeEvent, payload: unknown) => {
      if (!isTrustedSender(event)) {
        scoped.warn('rejected IPC from untrusted sender', { channel, url: event.senderFrame?.url });
        return err(appError('PERMISSION_DENIED', 'Untrusted IPC sender'));
      }
      try {
        return await handler(payload as never);
      } catch (cause) {
        scoped.error('handler threw', { channel, cause: String(cause) });
        return err(appError('UNKNOWN', `IPC handler failed: ${channel}`, cause));
      }
    });
  }
  scoped.info('registered IPC handlers', { count: channels.length });

  return () => {
    for (const channel of channels) ipcMain.removeHandler(channel);
  };
}

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? '';
  return url.startsWith('file://') || url.startsWith('http://localhost');
}
