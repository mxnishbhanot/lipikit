/**
 * Every channel name lives here, namespaced and frozen. Renderer never types a
 * raw string: the preload bridge is generated from this map, so a typo is a
 * compile error instead of a silently dead invoke().
 */
export const IPC = {
  settings: {
    get: 'settings:get',
    update: 'settings:update',
    /** Write settings + prompts + provider overrides to a file the user picks. */
    export: 'settings:export',
    import: 'settings:import',
  },
  history: {
    list: 'history:list',
    clear: 'history:clear',
    delete: 'history:delete',
  },
  clipboard: {
    list: 'clipboard:list',
    delete: 'clipboard:delete',
    clear: 'clipboard:clear',
  },
  favorites: {
    list: 'favorites:list',
    toggle: 'favorites:toggle',
  },
  providers: {
    list: 'providers:list',
    setApiKey: 'providers:set-api-key',
    hasApiKey: 'providers:has-api-key',
    deleteApiKey: 'providers:delete-api-key',
    /** Live model list from the vendor; falls back to the static catalog. */
    listModels: 'providers:list-models',
    /** Probe a key the user just typed, before it is stored. */
    validateKey: 'providers:validate-key',
    healthCheck: 'providers:health-check',
    /** Per-provider overrides: enabled, endpoint, default model. */
    settings: 'providers:settings',
    updateSettings: 'providers:update-settings',
  },
  ai: {
    generate: 'ai:generate',
    cancel: 'ai:cancel',
  },
  context: {
    /** Read whatever is already on the clipboard. */
    getSelection: 'context:get-selection',
    /** Inject copy into the foreground app, then read what it produced. */
    captureSelection: 'context:capture-selection',
    /** Write text back over the selection in the app that had focus. */
    replaceSelection: 'context:replace-selection',
    capabilities: 'context:capabilities',
    /** What app is in the foreground right now, and what to offer for it. */
    detect: 'context:detect',
  },
  prompts: {
    list: 'prompts:list',
    save: 'prompts:save',
    delete: 'prompts:delete',
  },
  overlay: {
    close: 'overlay:close',
    /** Content-driven height: the popup measures itself and asks for the size. */
    resize: 'overlay:resize',
    /** Hide the popup and bring the settings window forward. */
    openSettings: 'overlay:open-settings',
  },
  feedback: {
    /** Plain-text environment block for a bug report; no keys, no history. */
    diagnostics: 'feedback:diagnostics',
    /** Write the in-memory log buffer to a file the user picks. */
    exportLogs: 'feedback:export-logs',
    /** Save a PNG of the focused window for the user to attach themselves. */
    screenshot: 'feedback:screenshot',
  },
  app: {
    getInfo: 'app:get-info',
    quit: 'app:quit',
  },
} as const;

export const IPC_EVENTS = {
  settingsChanged: 'event:settings-changed',
  selectionCaptured: 'event:selection-captured',
  /** Hotkey fired but nothing could be captured; overlay shows the reason. */
  selectionCaptureFailed: 'event:selection-capture-failed',
  hotkeyTriggered: 'event:hotkey-triggered',
  /** Streaming tokens for an in-flight ai:generate call. */
  aiDelta: 'event:ai-delta',
  /** Foreground app resolved for the selection the popup is about to show. */
  contextDetected: 'event:context-detected',
  /** Main asks the main window to show a view — the popup's settings button. */
  navigate: 'event:navigate',
} as const;

export type IpcEventChannel = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS];
