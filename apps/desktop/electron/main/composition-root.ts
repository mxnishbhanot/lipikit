import { join } from 'node:path';
import { app } from 'electron';
import { createContainer, createConsoleLogger, type AppEnv, type Container } from '@ai-anywhere/shared';
import {
  createPlatformServices,
  registerPlatformServices,
  ACTIVE_WINDOW_SERVICE,
  CLIPBOARD_SERVICE,
} from '@ai-anywhere/platform';
import { API_KEY_STORE, PROVIDER_REGISTRY, createProviderRegistry } from '@ai-anywhere/providers';
import {
  DATABASE,
  HISTORY_REPOSITORY,
  SETTINGS_REPOSITORY,
  createHistoryRepository,
  createSettingsRepository,
  openDatabase,
} from '@ai-anywhere/database';
import {
  CAPTURE_STRATEGIES,
  TEXT_CAPTURE_SERVICE,
  createClipboardCaptureStrategy,
  createTextCaptureService,
} from '@ai-anywhere/context-engine';
import { createElectronApiKeyStore } from './services/api-key-store.electron.js';
import { createWindowManager } from './windows/window-manager.js';
import { ENV, LOGGER, WINDOW_MANAGER } from './tokens.js';

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

  registerPlatformServices(container, createPlatformServices(logger));

  container.register(WINDOW_MANAGER, (c) => createWindowManager(c.resolve(ENV), c.resolve(LOGGER)));

  container.register(DATABASE, (c) =>
    openDatabase({
      file: join(app.getPath('userData'), c.resolve(ENV).databaseFileName),
      logger: c.resolve(LOGGER),
    }),
  );
  container.register(SETTINGS_REPOSITORY, (c) => createSettingsRepository(c.resolve(DATABASE)));
  container.register(HISTORY_REPOSITORY, (c) => createHistoryRepository(c.resolve(DATABASE)));

  container.register(API_KEY_STORE, () => createElectronApiKeyStore());
  container.register(PROVIDER_REGISTRY, (c) =>
    // Phase 1 registers no vendor implementation: the registry serves the
    // static catalog, so the settings UI is buildable before any AI code.
    createProviderRegistry({ keys: c.resolve(API_KEY_STORE) }),
  );

  container.register(CAPTURE_STRATEGIES, (c) => [
    createClipboardCaptureStrategy({
      clipboard: c.resolve(CLIPBOARD_SERVICE),
      activeWindow: c.resolve(ACTIVE_WINDOW_SERVICE),
    }),
  ]);
  container.register(TEXT_CAPTURE_SERVICE, (c) =>
    createTextCaptureService(c.resolve(CAPTURE_STRATEGIES), c.resolve(LOGGER)),
  );

  return container;
}
