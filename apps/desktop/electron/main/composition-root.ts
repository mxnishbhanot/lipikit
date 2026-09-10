import { join } from 'node:path';
import { app } from 'electron';
import { createContainer, createConsoleLogger, type AppEnv, type Container } from '@lipikit/shared';
import {
  createPlatformServices,
  registerPlatformServices,
  ACTIVE_WINDOW_SERVICE,
  CLIPBOARD_SERVICE,
  CURSOR_SERVICE,
  KEYSTROKE_SERVICE,
  PLATFORM_SERVICES,
  SELECTION_SERVICE,
  TEXT_REPLACEMENT_SERVICE,
} from '@lipikit/platform';
import { API_KEY_STORE, PROVIDER_REGISTRY, createDefaultProviderRegistry } from '@lipikit/providers';
import {
  CLIPBOARD_REPOSITORY,
  DATABASE,
  FAVORITES_REPOSITORY,
  HISTORY_REPOSITORY,
  PROMPT_REPOSITORY,
  PROVIDER_SETTINGS_REPOSITORY,
  SETTINGS_REPOSITORY,
  createClipboardRepository,
  createFavoritesRepository,
  createHistoryRepository,
  createPromptRepository,
  createProviderSettingsRepository,
  createSettingsRepository,
  openDatabase,
} from '@lipikit/database';
import {
  APP_CONTEXT_SERVICE,
  CAPTURE_STRATEGIES,
  TEXT_CAPTURE_SERVICE,
  createAppContextService,
  createClipboardCaptureStrategy,
  createKeystrokeCaptureStrategy,
  createTextCaptureService,
} from '@lipikit/context-engine';
import { createElectronApiKeyStore } from './services/api-key-store.electron.js';
import { createAiService } from './services/ai-service.js';
import { createClipboardMonitor } from './services/clipboard-monitor.js';
import { createSelectionFlow } from './services/selection-flow.js';
import { createWindowManager } from './windows/window-manager.js';
import {
  AI_SERVICE,
  CLIPBOARD_MONITOR,
  ENV,
  LOGGER,
  PROVIDER_BASE_URLS,
  SELECTION_FLOW,
  WINDOW_MANAGER,
} from './tokens.js';

/**
 * The single composition root. Nothing else in the app constructs a service,
 * so wiring is readable in one screen and every dependency is swappable in a
 * test scope (container.createScope() + registerValue).
 */
export function buildContainer(env: AppEnv): Container {
  const container = createContainer();
  const logger = createConsoleLogger('main', env.logLevel);

  container.registerValue(ENV, env);
  container.registerValue(LOGGER, logger);

  registerPlatformServices(container, createPlatformServices(logger, { inputSettleMs: env.inputSettleMs }));

  container.register(DATABASE, (c) =>
    openDatabase({
      file: join(app.getPath('userData'), c.resolve(ENV).databaseFileName),
      logger: c.resolve(LOGGER),
    }),
  );
  container.register(SETTINGS_REPOSITORY, (c) => createSettingsRepository(c.resolve(DATABASE)));
  // Registered after the settings repository it reads: the main window
  // restores its own geometry and consults the minimize-to-tray preference,
  // so window state is one store rather than a second file beside the DB.
  container.register(WINDOW_MANAGER, (c) =>
    createWindowManager(c.resolve(ENV), c.resolve(LOGGER), c.resolve(SETTINGS_REPOSITORY)),
  );
  container.register(HISTORY_REPOSITORY, (c) => createHistoryRepository(c.resolve(DATABASE)));
  container.register(PROMPT_REPOSITORY, (c) => createPromptRepository(c.resolve(DATABASE)));
  container.register(CLIPBOARD_REPOSITORY, (c) => createClipboardRepository(c.resolve(DATABASE)));
  container.register(FAVORITES_REPOSITORY, (c) => createFavoritesRepository(c.resolve(DATABASE)));
  container.register(PROVIDER_SETTINGS_REPOSITORY, (c) =>
    createProviderSettingsRepository(c.resolve(DATABASE)),
  );

  container.register(API_KEY_STORE, () => createElectronApiKeyStore());
  // Env file supplies the Ollama default; the stored provider overrides win
  // over it, and the settings UI mutates this same record in place.
  container.register(PROVIDER_BASE_URLS, (c) => ({
    ollama: `${c.resolve(ENV).ollamaBaseUrl.replace(/\/$/, '')}/v1`,
    ...c.resolve(PROVIDER_SETTINGS_REPOSITORY).baseUrlOverrides(),
  }));
  container.register(PROVIDER_REGISTRY, (c) =>
    createDefaultProviderRegistry({
      keys: c.resolve(API_KEY_STORE),
      baseUrls: c.resolve(PROVIDER_BASE_URLS),
    }),
  );

  container.register(AI_SERVICE, (c) =>
    createAiService({
      providers: c.resolve(PROVIDER_REGISTRY),
      settings: c.resolve(SETTINGS_REPOSITORY),
      history: c.resolve(HISTORY_REPOSITORY),
      windows: c.resolve(WINDOW_MANAGER),
      clipboard: c.resolve(CLIPBOARD_SERVICE),
      logger: c.resolve(LOGGER),
    }),
  );

  container.register(APP_CONTEXT_SERVICE, (c) => {
    const activeWindow = c.resolve(ACTIVE_WINDOW_SERVICE);
    return createAppContextService({ getActiveWindow: () => activeWindow.getActiveWindow() });
  });

  // Order is the fallback order: inject Ctrl+C first, and only ask the user
  // to have copied the text themselves when no injector exists.
  container.register(CAPTURE_STRATEGIES, (c) => [
    createKeystrokeCaptureStrategy({
      selection: c.resolve(SELECTION_SERVICE),
      keystroke: c.resolve(KEYSTROKE_SERVICE),
    }),
    createClipboardCaptureStrategy({
      clipboard: c.resolve(CLIPBOARD_SERVICE),
      activeWindow: c.resolve(ACTIVE_WINDOW_SERVICE),
    }),
  ]);
  container.register(TEXT_CAPTURE_SERVICE, (c) =>
    createTextCaptureService(c.resolve(CAPTURE_STRATEGIES), c.resolve(LOGGER)),
  );

  container.register(CLIPBOARD_MONITOR, (c) =>
    createClipboardMonitor({
      clipboard: c.resolve(CLIPBOARD_SERVICE),
      activeWindow: c.resolve(ACTIVE_WINDOW_SERVICE),
      repository: c.resolve(CLIPBOARD_REPOSITORY),
      settings: c.resolve(SETTINGS_REPOSITORY),
      logger: c.resolve(LOGGER),
    }),
  );

  container.register(SELECTION_FLOW, (c) =>
    createSelectionFlow({
      capture: c.resolve(TEXT_CAPTURE_SERVICE),
      context: c.resolve(APP_CONTEXT_SERVICE),
      replacement: c.resolve(TEXT_REPLACEMENT_SERVICE),
      cursor: c.resolve(CURSOR_SERVICE),
      windows: c.resolve(WINDOW_MANAGER),
      logger: c.resolve(LOGGER),
    }),
  );

  // Resolved eagerly so the backend probe (which shells out) is warm before
  // the first hotkey press instead of on it.
  void container.resolve(PLATFORM_SERVICES).capabilities();

  return container;
}
