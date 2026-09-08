# Privacy Policy

_Last updated: 2026-09-09. Applies to AI Anywhere 1.0.0._

The product name is a placeholder; see `packages/shared/src/config/branding.ts`.

## The short version

The app runs entirely on your machine. It has no backend, no accounts, no
telemetry and no analytics. Nothing is sent anywhere except the text you
explicitly submit to the AI provider you configured, using your own API key.

## What is stored, and where

Everything lives in Electron's user-data directory on your own disk —
`%APPDATA%\<product name>` on Windows, `~/.config/<product name>` on Linux.

| Data                                                  | Where                          | Default    |
| ----------------------------------------------------- | ------------------------------ | ---------- |
| Settings, provider overrides, prompt templates        | SQLite database                | on         |
| Conversation history (input, output, provider, model) | SQLite database                | on         |
| Clipboard history                                     | SQLite database                | **off**    |
| API keys                                              | OS keyring, separate 0600 file | as entered |

Conversation history has a configurable retention in days and is swept at
startup. Entries can be deleted individually or all at once, and history can be
switched off entirely under settings → Privacy.

Clipboard history is off by default. While it is on, the main process polls the
clipboard every 1.5 seconds and records what any application copies — including
whatever a password manager puts there. That is why it is opt-in, why the poll
only runs while it is enabled, and why every row is individually deletable.

Conversation memory — replaying stored interactions back to the provider for
context — is a separate opt-in. Keeping a local log and sending that log to a
vendor are different decisions.

## API keys

Keys are encrypted through Electron's `safeStorage`, which uses DPAPI on
Windows and libsecret/kwallet on Linux, and are written outside the database. If
the keyring is unavailable, storing a key fails; there is no plaintext fallback.
Keys are never written to the database, never included in a settings export, and
never handed to the renderer — the renderer can only ask whether a key exists.

## What leaves your machine

Only requests you trigger, and only to the provider you selected: the text you
captured, your prompt, and the model parameters. The request goes directly from
the app to that vendor's API. There is no proxy and no intermediary — we never
see the text, and there is nothing to see it with.

What the provider then does with that text is governed by **their** policy, not
this one. Check the terms of whichever vendor you configure. Ollama is the
exception: it runs locally, so nothing leaves the machine at all.

The app also fetches the provider's model list when you open settings → Models,
and validates a key against the provider before storing it. Both are calls to
that same vendor.

## What we collect

Nothing. There is no crash reporting, no usage analytics, no update ping, and no
network call to any server we control.

## Uninstalling

Uninstalling leaves your data in place, so a reinstall finds it again. To erase
everything, delete the user-data directory above; keyring entries are removed
with it only if you also clear them from your OS keyring.

## Contact

Open an issue at https://github.com/mxnish-bhanot/ai-anywhere/issues.
