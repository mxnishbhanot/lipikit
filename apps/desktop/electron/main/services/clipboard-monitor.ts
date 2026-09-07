import { randomUUID } from 'node:crypto';
import type { ClipboardService } from '@ai-anywhere/platform';
import type { ClipboardRepository, SettingsRepository } from '@ai-anywhere/database';
import type { ActiveWindowService } from '@ai-anywhere/platform';
import type { Logger } from '@ai-anywhere/shared';

/**
 * Records what the user copies, while they have asked for it. Polling, not a
 * clipboard-change event: neither Windows nor Wayland exposes one Electron
 * surfaces, and a 1.5s poll of an in-memory string is cheaper than the
 * alternatives (a native listener addon, or an X11-only selection owner).
 *
 * The interval only runs while the feature is on, so the default install
 * polls nothing at all.
 */
export interface ClipboardMonitor {
  /** Idempotent: safe to call on every settings save. */
  sync(): void;
  stop(): void;
}

export interface ClipboardMonitorDeps {
  readonly clipboard: ClipboardService;
  readonly activeWindow: ActiveWindowService;
  readonly repository: ClipboardRepository;
  readonly settings: SettingsRepository;
  readonly logger: Logger;
}

// ponytail: fixed 1.5s poll; make it a setting only if someone asks.
const POLL_MS = 1_500;
/** A whole document pasted into the log is neither useful nor cheap. */
const MAX_TEXT_LENGTH = 20_000;

export function createClipboardMonitor(deps: ClipboardMonitorDeps): ClipboardMonitor {
  const scoped = deps.logger.child('clipboard-monitor');
  let timer: NodeJS.Timeout | null = null;
  let lastSeen: string | null = null;
  let polling = false;

  const record = async (): Promise<void> => {
    // A slow Linux backend shells out; overlapping polls would queue up.
    if (polling) return;
    polling = true;
    try {
      const settings = deps.settings.get();
      if (!settings.ok || !settings.value.clipboardHistoryEnabled) return;

      const text = await deps.clipboard.readText();
      if (text.length === 0 || text === lastSeen) return;
      lastSeen = text;
      // Restarts must not re-record what is already the newest row.
      const latest = deps.repository.latestText();
      if (latest.ok && latest.value === text) return;

      const source = await deps.activeWindow.getActiveWindow();
      const stored = deps.repository.insert({
        id: randomUUID(),
        text: text.slice(0, MAX_TEXT_LENGTH),
        appName: source.appName,
        createdAt: Date.now(),
      });
      if (!stored.ok) {
        scoped.warn('clipboard insert failed', { reason: stored.error.message });
        return;
      }
      deps.repository.trimTo(settings.value.clipboardHistoryLimit);
    } catch (cause) {
      scoped.warn('clipboard poll failed', { reason: String(cause) });
    } finally {
      polling = false;
    }
  };

  return {
    sync() {
      const settings = deps.settings.get();
      const wanted = settings.ok && settings.value.clipboardHistoryEnabled;
      if (wanted === (timer !== null)) return;
      if (!wanted) {
        this.stop();
        return;
      }
      // Whatever is on the clipboard when recording starts predates consent.
      lastSeen = null;
      void deps.clipboard.readText().then(
        (text) => {
          lastSeen = text;
        },
        () => undefined,
      );
      timer = setInterval(() => void record(), POLL_MS);
      timer.unref();
      scoped.info('clipboard history recording started');
    },
    stop() {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
      lastSeen = null;
      scoped.info('clipboard history recording stopped');
    },
  };
}
