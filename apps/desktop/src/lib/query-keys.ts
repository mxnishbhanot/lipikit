/** Central key registry: no stringly-typed keys scattered across features. */
export const queryKeys = {
  settings: ['settings'] as const,
  providers: ['providers'] as const,
  providerModels: (providerId: string) => ['provider-models', providerId] as const,
  providerKey: (providerId: string) => ['provider-key', providerId] as const,
  history: (limit: number, offset: number) => ['history', limit, offset] as const,
  appInfo: ['app-info'] as const,
  capabilities: ['platform-capabilities'] as const,
  prompts: ['custom-prompts'] as const,
  providerSettings: ['provider-settings'] as const,
  clipboard: (limit: number, offset: number) => ['clipboard', limit, offset] as const,
  favorites: (kind: string) => ['favorites', kind] as const,
};
