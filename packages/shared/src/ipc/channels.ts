/**
 * Every channel name lives here, namespaced and frozen. Renderer never types a
 * raw string: the preload bridge is generated from this map, so a typo is a
 * compile error instead of a silently dead invoke().
 */
export const IPC = {
  settings: {
    get: 'settings:get',
    update: 'settings:update',
  },
  history: {
    list: 'history:list',
    clear: 'history:clear',
  },
  providers: {
    list: 'providers:list',
    setApiKey: 'providers:set-api-key',
    hasApiKey: 'providers:has-api-key',
  },
  context: {
    getSelection: 'context:get-selection',
  },
  app: {
    getInfo: 'app:get-info',
    quit: 'app:quit',
  },
} as const;

export const IPC_EVENTS = {
  settingsChanged: 'event:settings-changed',
  selectionCaptured: 'event:selection-captured',
  hotkeyTriggered: 'event:hotkey-triggered',
} as const;

export type IpcEventChannel = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS];
