/** Central key registry: no stringly-typed keys scattered across features. */
export const queryKeys = {
  settings: ['settings'] as const,
  providers: ['providers'] as const,
  history: (limit: number, offset: number) => ['history', limit, offset] as const,
  appInfo: ['app-info'] as const,
};
