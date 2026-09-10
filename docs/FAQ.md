# FAQ

Setup and behaviour questions. For a symptom with an error next to it, the
README's [Troubleshooting](../README.md#troubleshooting) table is the faster
answer; for what is stored and what leaves the machine, see
[the privacy policy](PRIVACY.md).

### Do I need ChatGPT Plus?

No. A Plus subscription buys the ChatGPT web app, which is not what this talks
to. What it needs is an API key — OpenAI, Anthropic, Google, OpenRouter, Groq,
DeepSeek — billed per token by that vendor, which for popup-sized rewrites is
usually cents a day rather than a monthly fee. Ollama needs neither.

### Why bring your own key instead of a subscription?

Because it keeps the price honest and the choice yours: you pay the vendor
directly, pick the model per job, and switch provider from a dropdown instead
of cancelling anything. It is also what makes the privacy claims possible —
there is no server of ours between you and the model, because there is no
server of ours.

### Does it work offline?

The app opens, the palette works and your history stays readable, but a hosted
provider needs the network and the popup says so rather than hanging. Point it
at Ollama on your own machine and the whole flow works with the network
unplugged.

### Do I need an API key?

For the hosted providers, yes — one key from whichever vendor you already pay.
Ollama is the exception: point `OLLAMA_BASE_URL` at your local daemon and there
is no key and no bill.

### What does it cost?

Nothing. It is MIT-licensed. You pay your AI provider directly, at their prices,
with no markup — there is no intermediary to take one.

### Is there a macOS build?

No, and not soon. Windows and Ubuntu/Linux are the supported targets. macOS
needs an Accessibility-API backend and the permission prompts that come with it.

### Does it work in every application?

Capture and replacement use the same clipboard and keystroke path the OS gives
every app, so anything with a normal text field works. Wayland cannot let one
client raise another, so there the popup relies on focus returning when it
hides; the app reports a degraded session rather than failing silently.

### Why does Windows warn on first run?

The builds are not code-signed. SmartScreen flags any unsigned installer:
choose **More info**, then **Run anyway**. Signing is the first roadmap item.

### Does it update itself?

Not in 1.0 — auto-update waits on code signing. A new version is a download from
the [releases page](https://github.com/mxnishbhanot/lipikit/releases).
Installing over an existing copy leaves your data alone.

### Can I change the hotkey?

Yes, under settings → Shortcuts. `Ctrl+Space` is the default and can be rebound
but not removed — it is the only way into the popup. Two further global
shortcuts are unbound until you set them, and every prompt template can carry
one of its own. A global shortcut needs at least one modifier.

### Where does my history live?

In a SQLite database in the app's user-data directory on your own disk,
alongside settings and prompts. It never syncs anywhere. The configuration —
settings, prompts, provider overrides, never API keys — exports to one JSON
file; history and clipboard rows are a log, not configuration, and are neither
exported nor touched by an import.

### Which provider should I pick?

OpenAI is the fully-featured one. Anthropic, Gemini, OpenRouter, Groq and
DeepSeek work; Ollama runs locally with no key. Switching provider is a
settings change, not a reinstall.

### Why did storing my API key fail?

There is no plaintext fallback: keys go through the OS keyring (DPAPI on
Windows, libsecret/kwallet on Linux) or not at all. On Linux, install and unlock
gnome-keyring or kwallet, then try again.

### Which do I download, the installer or the portable .exe?

The installer if you want a Start menu entry, a desktop shortcut and launch at
login. The portable .exe if you want one file and no registry writes — it cannot
autostart. On Linux the AppImage needs no root; the `.deb` pulls in `xdotool`
and the tray dependency for you.

### Can I build it myself?

Yes: `pnpm install`, then `pnpm dist:win` or `pnpm dist:linux`. Artifacts land
in `apps/desktop/release/`. See the README for the toolchain requirements.

### The product name looks like a placeholder.

It is. Every user-visible name, tagline and URL comes from
`packages/shared/src/config/branding.ts`, and the icons are placeholder
geometry. Renaming is that file plus the two name fields in
`apps/desktop/electron-builder.yml`.
