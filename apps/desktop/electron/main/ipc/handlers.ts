import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, BrowserWindow, dialog, nativeTheme } from 'electron';
import {
  appError,
  err,
  IPC,
  IPC_EVENTS,
  ok,
  recentLogLines,
  type Container,
  type IpcHandlerMap,
  type Platform,
} from '@ai-anywhere/shared';
import { PROVIDER_REGISTRY, API_KEY_STORE } from '@ai-anywhere/providers';
import {
  applyBackup,
  buildBackup,
  parseBackup,
  CLIPBOARD_REPOSITORY,
  FAVORITES_REPOSITORY,
  HISTORY_REPOSITORY,
  PROMPT_REPOSITORY,
  PROVIDER_SETTINGS_REPOSITORY,
  SETTINGS_REPOSITORY,
} from '@ai-anywhere/database';
import { AUTOSTART_SERVICE, PLATFORM_SERVICES } from '@ai-anywhere/platform';
import { APP_CONTEXT_SERVICE, TEXT_CAPTURE_SERVICE } from '@ai-anywhere/context-engine';
import { bindGlobalHotkey, syncPromptHotkeys } from '../services/hotkey-binding.js';
import {
  AI_SERVICE,
  CLIPBOARD_MONITOR,
  ENV,
  PROVIDER_BASE_URLS,
  SELECTION_FLOW,
  WINDOW_MANAGER,
} from '../tokens.js';

/**
 * Handlers are thin: resolve a service, call one method, return its Result.
 * All rules live in the packages, so the same logic is testable without
 * Electron and reusable from a future CLI or tray-only mode.
 */
export function createIpcHandlers(container: Container): IpcHandlerMap {
  const settings = () => container.resolve(SETTINGS_REPOSITORY);
  const history = () => container.resolve(HISTORY_REPOSITORY);
  const prompts = () => container.resolve(PROMPT_REPOSITORY);
  /** Re-reads the list so the OS holds exactly the prompt shortcuts it stores. */
  const resyncPromptHotkeys = () => {
    const list = prompts().list();
    return list.ok ? syncPromptHotkeys(container, list.value) : list;
  };
  const providers = () => container.resolve(PROVIDER_REGISTRY);
  const keys = () => container.resolve(API_KEY_STORE);
  const windows = () => container.resolve(WINDOW_MANAGER);
  const flow = () => container.resolve(SELECTION_FLOW);
  const platform = () => container.resolve(PLATFORM_SERVICES);
  const ai = () => container.resolve(AI_SERVICE);
  const clipboard = () => container.resolve(CLIPBOARD_REPOSITORY);
  const favorites = () => container.resolve(FAVORITES_REPOSITORY);
  const providerSettings = () => container.resolve(PROVIDER_SETTINGS_REPOSITORY);
  const backupDeps = () => ({
    settings: settings(),
    prompts: prompts(),
    providers: providerSettings(),
  });
  /** Parent for the file dialogs, so they open modal to the settings window. */
  const focused = () => BrowserWindow.getFocusedWindow() ?? undefined;

  /**
   * Adapters read this record on every call, so replacing its contents is the
   * whole of "apply the new endpoint" — no provider instance to rebuild. The
   * env default for Ollama is kept when the user clears their override.
   */
  const refreshBaseUrls = (): void => {
    const live = container.resolve(PROVIDER_BASE_URLS);
    const overrides = providerSettings().baseUrlOverrides();
    for (const key of Object.keys(live)) {
      if (key !== 'ollama') delete live[key];
    }
    Object.assign(live, overrides);
    if (overrides['ollama'] === undefined) {
      live['ollama'] = `${container.resolve(ENV).ollamaBaseUrl.replace(/\/$/, '')}/v1`;
    }
  };
  /** Resolve a provider or hand back its Result error unchanged. */
  const provider = (providerId: Parameters<ReturnType<typeof providers>['get']>[0]) =>
    providers().get(providerId);

  return {
    [IPC.settings.get]: () => settings().get(),
    [IPC.settings.update]: async (patch) => {
      const result = settings().update(patch);
      if (!result.ok) return result;
      // Rebinding here, not in a settings watcher: the accelerator is dead
      // until the OS re-registers it, so a silent save would look like the
      // hotkey simply stopped working.
      if (patch.globalHotkey !== undefined) {
        const bind = bindGlobalHotkey(container, result.value.globalHotkey, 'palette');
        if (!bind.ok) return err(bind.error);
      }
      if (patch.clientReplyHotkey !== undefined) {
        const bind = bindGlobalHotkey(container, result.value.clientReplyHotkey, 'client-reply');
        if (!bind.ok) return err(bind.error);
      }
      // The title bar and the caption buttons belong to the OS, so the theme
      // has to be pushed there as well as to the renderer.
      if (patch.theme !== undefined) nativeTheme.themeSource = result.value.theme;
      if (patch.launchAtLogin !== undefined) {
        // Reported back as an error, not swallowed: on Linux this is a file in
        // ~/.config/autostart that can genuinely fail to be written, and a
        // checkbox that silently lies about autostart is worse than none.
        const autostart = await container.resolve(AUTOSTART_SERVICE).setEnabled(result.value.launchAtLogin);
        if (!autostart.ok) {
          settings().update({ launchAtLogin: false });
          return err(autostart.error);
        }
      }
      // Starts or stops the poll; the monitor decides, so the toggle and the
      // startup path cannot disagree about whether recording is running.
      if (patch.clipboardHistoryEnabled !== undefined || patch.clipboardHistoryLimit !== undefined) {
        container.resolve(CLIPBOARD_MONITOR).sync();
      }
      windows().broadcast(IPC_EVENTS.settingsChanged, result.value);
      return result;
    },

    [IPC.settings.export]: async () => {
      const backup = buildBackup(backupDeps(), app.getVersion());
      if (!backup.ok) return backup;
      const parent = focused();
      const options = {
        title: 'Export settings',
        defaultPath: join(app.getPath('documents'), 'ai-anywhere-settings.json'),
        filters: [{ name: 'JSON', extensions: ['json'] }],
      };
      const chosen = await (parent ? dialog.showSaveDialog(parent, options) : dialog.showSaveDialog(options));
      if (chosen.canceled || !chosen.filePath) return ok(null);
      try {
        await writeFile(chosen.filePath, JSON.stringify(backup.value, null, 2), 'utf8');
        return ok(chosen.filePath);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Could not write the export file', cause));
      }
    },

    [IPC.settings.import]: async () => {
      const parent = focused();
      const options = {
        title: 'Import settings',
        properties: ['openFile' as const],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      };
      const chosen = await (parent ? dialog.showOpenDialog(parent, options) : dialog.showOpenDialog(options));
      const file = chosen.filePaths[0];
      if (chosen.canceled || file === undefined) return ok(null);

      let contents: string;
      try {
        contents = await readFile(file, 'utf8');
      } catch (cause) {
        return err(appError('UNKNOWN', 'Could not read that file', cause));
      }
      const parsed = parseBackup(contents);
      if (!parsed.ok) return parsed;
      const applied = applyBackup(backupDeps(), parsed.value);
      if (!applied.ok) return applied;

      // An import can change both hotkeys and the endpoints, so everything
      // settings:update would have re-applied has to be re-applied here too.
      bindGlobalHotkey(container, applied.value.globalHotkey, 'palette');
      bindGlobalHotkey(container, applied.value.clientReplyHotkey, 'client-reply');
      nativeTheme.themeSource = applied.value.theme;
      resyncPromptHotkeys();
      refreshBaseUrls();
      container.resolve(CLIPBOARD_MONITOR).sync();
      windows().broadcast(IPC_EVENTS.settingsChanged, applied.value);
      return ok(applied.value);
    },

    [IPC.history.list]: (query) => history().list(query),
    [IPC.history.clear]: () => history().clear(),
    [IPC.history.delete]: ({ id }) => history().delete(id),

    [IPC.clipboard.list]: (query) => clipboard().list(query),
    [IPC.clipboard.delete]: ({ id }) => clipboard().delete(id),
    [IPC.clipboard.clear]: () => clipboard().clear(),

    [IPC.favorites.list]: ({ kind }) => favorites().list(kind),
    [IPC.favorites.toggle]: ({ kind, id }) => favorites().toggle(kind, id),

    [IPC.providers.list]: () => ok(providers().descriptors()),
    [IPC.providers.setApiKey]: ({ providerId, apiKey }) => keys().set(providerId, apiKey),
    [IPC.providers.hasApiKey]: async ({ providerId }) => ok(await keys().has(providerId)),
    [IPC.providers.deleteApiKey]: async ({ providerId }) => {
      await keys().delete(providerId);
      return ok(undefined);
    },
    [IPC.providers.listModels]: async ({ providerId }) => {
      const resolved = provider(providerId);
      return resolved.ok ? await resolved.value.listModels() : resolved;
    },
    // The key is validated before it is stored, so a typo never becomes the
    // saved credential.
    [IPC.providers.validateKey]: async ({ providerId, apiKey }) => {
      const resolved = provider(providerId);
      return resolved.ok ? await resolved.value.validateKey(apiKey) : resolved;
    },
    [IPC.providers.healthCheck]: async ({ providerId }) => {
      const resolved = provider(providerId);
      return resolved.ok ? await resolved.value.healthCheck() : resolved;
    },
    [IPC.providers.settings]: () => providerSettings().list(),
    [IPC.providers.updateSettings]: (patch) => {
      const result = providerSettings().save(patch);
      if (result.ok) refreshBaseUrls();
      return result;
    },

    [IPC.ai.generate]: (request) => ai().generate(request),
    [IPC.ai.cancel]: ({ requestId }) => ai().cancel(requestId),

    [IPC.context.getSelection]: () => container.resolve(TEXT_CAPTURE_SERVICE).captureSelection(),
    [IPC.context.captureSelection]: () => flow().capture(),
    [IPC.context.replaceSelection]: (request) => flow().replace(request),
    [IPC.context.capabilities]: async () => ok(await platform().capabilities()),
    [IPC.context.detect]: async () => ok(await container.resolve(APP_CONTEXT_SERVICE).detect()),

    [IPC.prompts.list]: () => prompts().list(),
    [IPC.prompts.save]: (request) => {
      const now = Date.now();
      // One upsert for both create and edit: the renderer sends an id only
      // when it is editing, so a missing id is what "new" means. ON CONFLICT
      // leaves created_at alone, so this `now` only lands on a real create.
      const saved = prompts().save({
        id: request.id ?? randomUUID(),
        label: request.label,
        group: request.group,
        template: request.template,
        appId: request.appId,
        shortcut: request.shortcut,
        createdAt: now,
        updatedAt: now,
      });
      if (!saved.ok) return saved;
      // The prompt is already stored, so a refused combination is reported as
      // "saved, but the shortcut did not take" rather than losing the edit.
      const synced = resyncPromptHotkeys();
      if (!synced.ok) {
        return err(
          appError(
            'VALIDATION',
            `Prompt saved, but ${request.shortcut ?? 'the shortcut'} is already taken by another app`,
            synced.error,
          ),
        );
      }
      return saved;
    },
    [IPC.prompts.delete]: ({ id }) => {
      const removed = prompts().delete(id);
      if (!removed.ok) return removed;
      resyncPromptHotkeys();
      return removed;
    },

    [IPC.overlay.close]: () => flow().dismiss(),

    [IPC.overlay.resize]: ({ height }) => {
      if (!Number.isFinite(height) || height <= 0) {
        return err(appError('VALIDATION', 'Overlay height must be a positive number'));
      }
      windows().resizeOverlay(height);
      return ok(undefined);
    },

    [IPC.overlay.openSettings]: () => {
      windows().hideOverlay();
      windows().showMain();
      // The main window may already be open on another view; tell it which one
      // the user asked for rather than leaving them to click again.
      windows().broadcast(IPC_EVENTS.navigate, { view: 'settings' });
      return ok(undefined);
    },

    /**
     * Everything a bug report needs about this machine and nothing it does
     * not: no API keys, no history, no clipboard, no text the user rewrote.
     */
    [IPC.feedback.diagnostics]: async () => {
      const stored = settings().get();
      const caps = await platform().capabilities();
      const enabled = providerSettings().list();
      const lines = [
        `App: ${app.getName()} ${app.getVersion()} (${app.isPackaged ? 'packaged' : 'development'})`,
        `Electron: ${process.versions.electron} · Chrome: ${process.versions.chrome} · Node: ${process.versions.node}`,
        `OS: ${process.platform} ${process.arch} ${process.getSystemVersion?.() ?? ''}`.trim(),
        `Display server: ${caps.displayServer ?? 'n/a'}`,
        `Clipboard backend: ${caps.clipboardBackend} · Keystroke backend: ${caps.keystrokeBackend}`,
        `Capture selection: ${caps.canCaptureSelection} · Replace text: ${caps.canReplaceText}`,
        `Providers enabled: ${
          enabled.ok
            ? enabled.value
                .filter((entry) => entry.enabled)
                .map((entry) => entry.providerId)
                .join(', ') || 'none'
            : 'unknown'
        }`,
        stored.ok
          ? `Settings: provider=${stored.value.defaultProvider} model=${stored.value.defaultModel} streaming=${stored.value.streamingEnabled} history=${stored.value.historyEnabled} clipboard=${stored.value.clipboardHistoryEnabled} theme=${stored.value.theme}`
          : 'Settings: unreadable',
      ];
      return ok(lines.join('\n'));
    },

    [IPC.feedback.exportLogs]: async () => {
      const parent = focused();
      const options = {
        title: 'Export logs',
        defaultPath: join(app.getPath('documents'), 'ai-anywhere-logs.txt'),
        filters: [{ name: 'Text', extensions: ['txt', 'log'] }],
      };
      const chosen = await (parent ? dialog.showSaveDialog(parent, options) : dialog.showSaveDialog(options));
      if (chosen.canceled || !chosen.filePath) return ok(null);
      try {
        await writeFile(chosen.filePath, `${recentLogLines().join('\n')}\n`, 'utf8');
        return ok(chosen.filePath);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Could not write the log file', cause));
      }
    },

    /**
     * The focused window only — the popup is gone by the time Settings has
     * focus, so this captures what the reporter is looking at, not the screen.
     * A whole-desktop grab would need desktopCapturer and, on Wayland, a
     * portal prompt for every shot.
     */
    [IPC.feedback.screenshot]: async () => {
      const parent = focused();
      if (!parent) return err(appError('UNKNOWN', 'No window is focused to capture'));
      const image = await parent.capturePage();
      const options = {
        title: 'Save screenshot',
        defaultPath: join(app.getPath('pictures'), `ai-anywhere-${Date.now()}.png`),
        filters: [{ name: 'PNG', extensions: ['png'] }],
      };
      const chosen = await dialog.showSaveDialog(parent, options);
      if (chosen.canceled || !chosen.filePath) return ok(null);
      try {
        await writeFile(chosen.filePath, image.toPNG());
        return ok(chosen.filePath);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Could not write the screenshot', cause));
      }
    },

    [IPC.app.getInfo]: () =>
      ok({
        version: app.getVersion(),
        platform: process.platform as Platform,
        isPackaged: app.isPackaged,
      }),
    [IPC.app.quit]: () => {
      app.quit();
      return ok(undefined);
    },
  };
}
