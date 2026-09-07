import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-types/**',
      '**/out/**',
      '**/release/**',
      '**/*.cjs',
      // This file: type-aware rules cannot resolve untyped plugin exports.
      'eslint.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // Build/config files sit outside the tsconfig graph.
        // Build, test and config files sit outside the tsconfig graph.
        projectService: { allowDefaultProject: ['*.config.ts', 'apps/desktop/e2e/*.ts'] },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node, ...globals.es2023 },
    },
    rules: {
      // Architecture rules that matter more than style here:
      'no-console': ['error', { allow: ['error'] }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      // Interfaces here are async by contract; an implementation that happens
      // to be synchronous today must still return a Promise.
      '@typescript-eslint/require-await': 'off',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'electron',
              message:
                'Electron APIs belong in apps/desktop/electron or a platform adapter — never in a feature or React component.',
            },
          ],
        },
      ],
    },
  },
  {
    // The renderer is browser code: no Node globals, hooks rules on.
    files: ['apps/desktop/src/**/*.{ts,tsx}', 'packages/ui/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Zustand selectors return plain closures, not `this`-bound methods.
      '@typescript-eslint/unbound-method': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['buttonVariants'] },
      ],
    },
  },
  {
    // Only these directories may talk to Electron directly.
    files: ['apps/desktop/electron/**/*.ts', 'packages/platform/src/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // React Query hook return types are huge and version-unstable; the
    // inferred type is both more accurate and less churn than writing them.
    files: ['apps/desktop/src/**/api/*.ts'],
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'off' },
  },
  {
    // A top-level test() returns a promise nobody awaits, by design.
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    rules: { '@typescript-eslint/no-floating-promises': 'off' },
  },
  prettier,
);
