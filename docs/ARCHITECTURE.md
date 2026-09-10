# Architecture

Design rationale for LipiKit. See also: [README](../README.md).

## Architecture decisions

**pnpm workspace monorepo.** The desktop shell, the OS adapters and the domain
logic version together and break together; separate repos would mean publishing
a package to test a one-line type change. pnpm's symlinked store also keeps one
Electron download for the whole tree, and `node-linker=hoisted` (`.npmrc`) is set
because electron-builder and native modules assume a real `node_modules`.

**Electron main / preload / renderer split, enforced by ESLint.** The renderer
runs with `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`.
Its entire native surface is two functions (`invoke`, `on`) exposed by preload,
both channel-allowlisted. `no-restricted-imports` bans `electron` outside
`electron/**` and `packages/platform`, so no React component can quietly reach
into the main process.

**One typed IPC contract.** `packages/shared/src/ipc/contract.ts` maps every
channel to its request/response pair. Main registers handlers as an
`IpcHandlerMap` (missing a channel is a compile error), preload re-exposes the
same channel list, and the renderer's `ipcInvoke` infers the response type from
the channel. Channel names are constants, never inline strings.

**Errors are data (`Result<T, AppError>`), not exceptions.** An `Error` does not
survive structured cloning across IPC — the stack and the type are gone. Handlers
return a discriminated union with a stable `code`, so the UI can branch on
`PROVIDER_RATE_LIMIT` vs `PERMISSION_DENIED` instead of string-matching messages.
`ipcInvoke` unwraps it into a throw once, at the React Query boundary.

**Dependency injection via a ~60-line typed container.** Services are created in
exactly one place (`composition-root.ts`) and resolved by branded token, so a
test swaps SQLite or the clipboard with `container.createScope()`. Decorators and
`reflect-metadata` were skipped: they need experimental compiler flags and a
runtime shim to buy nothing over a token when there is one composition root.

**No business logic in components.** Components call feature hooks
(`features/*/api/*.queries.ts`), hooks call `ipcInvoke`, main-process services
hold the rules. Anything above the IPC line stays runnable without Electron.

**React Query owns server state, Zustand owns UI state.** Settings, history and
providers live in main; React Query caches them and the main process pushes
`settings-changed` to invalidate — no polling. Zustand holds only view state
(active tab, draft tone). Two caches for the same data is how stale-UI bugs start.

**Platform differences are interfaces, not `if (process.platform)`.** Clipboard,
hotkey, active-window and autostart each get a contract in
`packages/platform/src/contracts.ts`. Electron covers clipboard and hotkeys
identically on both OSes; only active-window detection genuinely diverges
(PowerShell vs `xdotool`), and Wayland — which exposes no such API — reports
nulls rather than pretending. Unsupported platforms fail at startup, in
`detectPlatformInfo`.

**One provider interface, seven implementations, no switch statement.**
Features depend on `AiProvider`; only the composition root knows which vendors
exist. The AI orchestration (settings, prompt template, provider call, history
write) sits in `apps/desktop/electron/main/services/ai-service.ts` because it
is the only thing that needs the registry, the database and the renderer push
channel at once — the adapters themselves know about none of the three.

**SQLite via repositories, credentials via the OS keyring.** better-sqlite3 is
synchronous, which suits a single-user local app and avoids a connection pool.
Migrations are append-only and transactional; settings are key/value rows so a
new setting needs no migration. API keys never enter the database or the
renderer — `safeStorage` (DPAPI / libsecret) encrypts them to a separate
0600 file, and the renderer can only ask _whether_ a key exists.

**Strict TypeScript with project references.** `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes` and friends are on in `tsconfig.base.json`;
`tsc -b` builds packages in dependency order and caches with
`.tsbuildinfo`. Path aliases were deliberately dropped in favour of real
workspace package boundaries, so an import cycle between packages is impossible
rather than merely discouraged.

**electron-vite over hand-rolled Vite configs.** One config for three build
targets. Workspace packages are bundled into the main/preload output; only real
`node_modules` (notably better-sqlite3, which must keep its `.node` binary) stay
external and get `asarUnpack`ed by electron-builder.
