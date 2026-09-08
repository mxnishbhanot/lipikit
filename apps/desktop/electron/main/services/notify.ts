import { Notification } from 'electron';

/**
 * Desktop notification, best effort. Electron's Notification is native on both
 * targets — the Windows toast/Action Center on one side, the org.freedesktop
 * Notifications D-Bus service every mainstream Linux desktop implements on the
 * other — so there is nothing to add and no dependency to install.
 *
 * `isSupported()` is false on a Linux session with no notification daemon
 * running, where constructing one throws nothing but shows nobody anything.
 */
export function notify(title: string, body: string): void {
  if (!Notification.isSupported()) return;
  new Notification({ title, body }).show();
}
