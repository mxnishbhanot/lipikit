import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Badge,
  Button,
  EmptyState,
  Kbd,
  SkeletonText,
  StreamCaret,
  ThinkingIndicator,
  cn,
  loadingPulse,
  popup,
  slideUp,
} from '@ai-anywhere/ui';
import {
  ArrowLeft,
  Check,
  Copy,
  CornerDownLeft,
  Eye,
  Pencil,
  Pin,
  PinOff,
  RotateCcw,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { mergeCommands, parseReply, resolveInstruction, type PaletteCommand } from '@ai-anywhere/prompts';
import {
  IPC_EVENTS,
  type AppContext,
  type AppError,
  type OverlayMode,
  type ProviderId,
  type ReplyAnalysis,
  type SelectionSource,
} from '@ai-anywhere/shared';
import { ipcOn } from '../../../lib/ipc-client.js';
import {
  closeOverlay,
  openSettingsWindow,
  useCapabilities,
  useCaptureSelection,
  useOverlayAutoHeight,
  useReplaceSelection,
} from '../api/overlay.queries.js';
import { useGenerate } from '../api/ai.queries.js';
import {
  useHasApiKey,
  useProviders,
  useSettings,
  useSwitchProvider,
} from '../../settings/api/settings.queries.js';
import { useOnline } from '../../../lib/use-online.js';
import { useCustomPrompts } from '../../prompts/api/prompts.queries.js';
import { useCommandPrefs } from '../use-command-prefs.js';
import { isHelpKey } from '../../../app/shortcut-keys.js';
import { ShortcutList } from '../../../app/shortcuts.js';
import { CommandPalette } from './CommandPalette.js';
import { AnalysisChips, ClientReply } from './ClientReply.js';
// react-markdown + highlight.js are the heaviest thing the popup can show and
// nothing is markdown until an answer arrives, so they load on the first
// answer instead of on every hotkey press.
const ResponseMarkdown = lazy(async () => ({
  default: (await import('./ResponseMarkdown.js')).ResponseMarkdown,
}));

/** What was last run, so Retry needs no re-pick and no re-typing. */
interface LastRun {
  readonly command: PaletteCommand;
  readonly input: string;
}

/**
 * The popup that opens at the cursor after the hotkey: pick a command from the
 * palette, watch the answer stream in, then write it back over the original
 * selection — or copy it, or insert it underneath.
 *
 * It owns the shell — search header, footer, and the window's own height —
 * while the palette and the result view are only bodies swapped inside it.
 * That split is what lets the search field stay mounted (and focused) across
 * a command running and coming back.
 */
export function Overlay(): JSX.Element {
  const [selection, setSelection] = useState('');
  const [source, setSource] = useState<SelectionSource | null>(null);
  const [captureError, setCaptureError] = useState<AppError | null>(null);
  // Detected in main *before* the popup takes focus; asking for it from here
  // would only ever answer "AI Anywhere".
  const [context, setContext] = useState<AppContext | null>(null);
  const [lastRun, setLastRun] = useState<LastRun | null>(null);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState('');
  /** Wall-clock of the last completed call, for the footer indicator. */
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  // Which hotkey opened the popup: the main one lands on the palette, the
  // optional ones on the reply-style picker or straight into one command.
  const [mode, setMode] = useState<OverlayMode>('palette');
  // Command the quick-prompt shortcut asked for. It cannot run at announce
  // time: the selection arrives in a later event, so it waits here.
  const [pendingCommandId, setPendingCommandId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ReplyAnalysis | null>(null);
  // Rendered markdown is the default; the raw view is for hand-editing the
  // text that Replace is about to write back.
  const [raw, setRaw] = useState(false);
  /** Pinned: incoming selections and hotkey presses leave the answer alone. */
  const [pinned, setPinned] = useState(false);
  /** Non-null while the prompt is being re-worded for a re-run. */
  const [promptDraft, setPromptDraft] = useState<string | null>(null);
  /**
   * The cheatsheet is a body, not a modal: this window is sized to its content,
   * so a fixed overlay would be clipped by the window rather than growing it.
   */
  const [help, setHelp] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Read from inside the IPC subscriptions, which are set up once; state would
  // make them resubscribe on every toggle.
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;

  const capabilities = useCapabilities();
  const ai = useGenerate();
  const { reset: resetAi, run: runAi } = ai;
  const replace = useReplaceSelection();
  const recapture = useCaptureSelection();
  const prefs = useCommandPrefs();
  const customPrompts = useCustomPrompts();
  const settings = useSettings();
  const providers = useProviders();
  const switchProvider = useSwitchProvider();
  const prompts = useMemo(() => customPrompts.data ?? [], [customPrompts.data]);
  const commands = useMemo(() => mergeCommands(prompts), [prompts]);
  // Destructured because both are stable identities, and the objects that
  // hold them are not: an effect keyed on `replace` would resubscribe to the
  // selection events on every single render.
  const { reset: resetReplace } = replace;
  const { remember } = prefs;

  // The palette is the popup's home screen; a finished or running command
  // replaces it with the result view.
  const showResult = lastRun !== null;

  // The window follows its content instead of a fixed 440px: a search that
  // matches two commands should not leave half the popup empty.
  const shellRef = useOverlayAutoHeight();

  const reset = useCallback(() => {
    setLastRun(null);
    setOutput('');
    setAnalysis(null);
    setCopied(false);
    setRaw(false);
    setPromptDraft(null);
    resetAi();
    resetReplace();
  }, [resetAi, resetReplace]);

  /**
   * The reset that fires on its own — a fresh capture, the other hotkey.
   * A pinned answer survives it, which is the whole point of the pin: go
   * select something else without losing what is already on screen.
   */
  const autoReset = useCallback(() => {
    if (pinnedRef.current) return;
    reset();
  }, [reset]);

  useEffect(() => {
    const unsubscribeCaptured = ipcOn(IPC_EVENTS.selectionCaptured, (captured) => {
      setCaptureError(null);
      autoReset();
      setSource(captured.source);
      setSelection(captured.text);
    });
    const unsubscribeContext = ipcOn(IPC_EVENTS.contextDetected, setContext);
    const unsubscribeHotkey = ipcOn(IPC_EVENTS.hotkeyTriggered, (press) => {
      // Pressing the other hotkey while the popup is open switches screens
      // rather than stacking a second result on top of the first.
      setMode(press.mode);
      setPendingCommandId(press.commandId ?? null);
      setQuery('');
      autoReset();
    });
    const unsubscribeFailed = ipcOn(IPC_EVENTS.selectionCaptureFailed, (error) => {
      setSource(null);
      setSelection('');
      autoReset();
      setCaptureError(error);
    });
    return () => {
      unsubscribeCaptured();
      unsubscribeContext();
      unsubscribeHotkey();
      unsubscribeFailed();
    };
  }, [autoReset]);

  // Deltas land in the editable output box as they arrive, so the first token
  // is on screen long before the last one.
  useEffect(() => {
    if (ai.output.length > 0) setOutput(ai.output);
  }, [ai.output]);

  const run = useCallback(
    async (command: PaletteCommand, input: string): Promise<void> => {
      const text = selection.trim();
      if (text.length === 0 || ai.isPending) return;
      setCaptureError(null);
      setCopied(false);
      setOutput('');
      setAnalysis(null);
      setLatencyMs(null);
      setRaw(false);
      setPromptDraft(null);
      setLastRun({ command, input });
      remember({ commandId: command.id, input });
      const instruction = resolveInstruction(command, input);
      const startedAt = performance.now();
      try {
        const answer = await runAi({
          action: command.action,
          text,
          // The detected label beats the raw process name: {{app}} reads
          // better as "Slack" than as "slack".
          appName: context?.label ?? source?.appName ?? null,
          windowTitle: context?.windowTitle ?? source?.windowTitle ?? null,
          ...(instruction === undefined ? {} : { instruction }),
          ...(command.tone === undefined ? {} : { tone: command.tone }),
          ...(command.replyStyle === undefined ? {} : { replyStyle: command.replyStyle }),
          ...(command.template === undefined ? {} : { promptTemplate: command.template }),
        });
        setLatencyMs(performance.now() - startedAt);
        if (command.action === 'client-reply') {
          // The ANALYSIS header is scaffolding for the chips; only the reply
          // itself belongs in the box the user edits and pastes.
          const parsed = parseReply(answer);
          setAnalysis(parsed.analysis);
          setOutput(parsed.reply);
        } else {
          setOutput(answer);
        }
      } catch {
        // Rendered from ai.error; the result view stays put so Retry and Back
        // are both one keystroke away.
      }
    },
    [selection, ai.isPending, runAi, source, context, remember],
  );

  // The quick-prompt shortcut, once both halves have arrived. A command that
  // needs typed input cannot be run blind, so it falls back to the palette
  // with that command's own screen doing the asking.
  useEffect(() => {
    if (pendingCommandId === null) return;
    if (selection.trim().length === 0) return;
    const command = commands.find((candidate) => candidate.id === pendingCommandId);
    setPendingCommandId(null);
    if (command === undefined || command.inputPlaceholder !== undefined) return;
    void run(command, '');
  }, [pendingCommandId, selection, commands, run]);

  const back = useCallback((): void => {
    ai.cancel();
    // Leaving the answer on purpose also drops the pin: a pin that outlived
    // the thing it was pinning would silently swallow the next capture.
    setPinned(false);
    reset();
  }, [ai, reset]);

  /** Writes back over the highlighted text; `keepOriginal` appends instead. */
  const write = useCallback(
    async (keepOriginal: boolean): Promise<void> => {
      const text = keepOriginal ? `${selection}\n\n${output}` : output;
      if (text.trim().length === 0) return;
      await replace.mutateAsync({ text, target: source });
    },
    [selection, output, replace, source],
  );

  const copy = useCallback(async (): Promise<void> => {
    if (output.length === 0) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }, [output]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // F1 or Ctrl+/ from anywhere, including while an answer is streaming:
      // the search field always holds focus here, so a bare `?` would only
      // ever be a typed character.
      if (isHelpKey(event)) {
        event.preventDefault();
        setHelp((current) => !current);
        return;
      }
      // Ctrl+K is the search gesture: focus the field and clear it, from
      // anywhere in the popup including the result view.
      if (event.key === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (showResult) back();
        setQuery('');
        searchRef.current?.focus();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        // In the result view Escape steps back to the palette; only from the
        // palette itself does it dismiss the popup.
        if (help) setHelp(false);
        else if (showResult) back();
        else void closeOverlay();
        return;
      }
      // Ctrl+Enter is the submit gesture everywhere else in these apps.
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && showResult && !ai.isPending) {
        event.preventDefault();
        void write(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showResult, back, write, ai.isPending, help]);

  const onRecapture = async (): Promise<void> => {
    const captured = await recapture.mutateAsync();
    setCaptureError(null);
    reset();
    setSource(captured.source);
    setSelection(captured.text);
  };

  const online = useOnline();
  // The two things that stop *every* command before it starts: no network and
  // no key. Both are explained in the body rather than as a footer warning —
  // a palette the user cannot run is worse than a screen saying why.
  const activeProvider = providers.data?.find((entry) => entry.id === settings.data?.defaultProvider) ?? null;
  const hasKey = useHasApiKey(settings.data?.defaultProvider ?? 'openai');
  const missingKey = activeProvider?.requiresApiKey === true && hasKey.data === false;
  const blocked = !online || missingKey;

  const degraded = capabilities.data && !capabilities.data.canReplaceText;
  const busy = ai.isPending;
  const providerLabel =
    providers.data?.find((entry) => entry.id === settings.data?.defaultProvider)?.label ??
    settings.data?.defaultProvider ??
    '';
  // A provider with no key cannot be switched to; the popup is not the place
  // to enter one, so an unconfigured vendor is simply not offered.
  const selectableProviders = (providers.data ?? []).filter(
    (entry) => !entry.requiresApiKey || entry.id === settings.data?.defaultProvider,
  );
  // `ai.error` is rendered inside the result box, so the footer line carries
  // only the errors that have nowhere else to go.
  const errorMessage = captureError?.message ?? replace.error?.message ?? null;

  return (
    // The window is transparent and 16px wider and taller than the popup on
    // every side: this gutter is where the CSS shadow falls. The compositor's
    // own shadow is off, because it is drawn square around the window and
    // would sit behind these rounded corners. The measured element is this
    // wrapper, so the window follows the popup *and* its gutter.
    <div ref={shellRef} className="p-4">
      <motion.div
        variants={popup}
        initial="hidden"
        animate="visible"
        // Grows from the cursor: the popup opens where the caret was.
        className="popup-surface flex max-h-[41rem] w-full origin-top-left flex-col overflow-hidden rounded-popup text-fg-primary"
      >
        {/* The header is the window's drag handle: it is frameless, so without
            a drag region the popup can only ever be where it opened. Every
            control inside it opts back out with `no-drag`, or a click on the
            close button would start a drag instead. */}
        <header
          className={cn(
            'flex shrink-0 items-center gap-2 border-b border-border/70 px-3.5 py-2.5',
            '[-webkit-app-region:drag]',
          )}
        >
          {showResult ? (
            <button
              type="button"
              onClick={back}
              aria-label="Back to commands"
              className="rounded-control p-1.5 text-fg-muted transition-colors duration-fast hover:bg-surface-hover hover:text-fg-primary [-webkit-app-region:no-drag]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <Search className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
          )}

          {showResult ? (
            <span className="flex-1 truncate text-body font-medium">{lastRun.command.label}</span>
          ) : (
            // Borderless on purpose: the popup *is* the search box, so a second
            // framed field inside it would be a box in a box.
            <input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              // The detected app used to be tacked onto this placeholder; the
              // palette now shows it as a chip of its own, so repeating it here
              // would be the same fact twice on one screen.
              placeholder={mode === 'client-reply' ? 'Client reply' : 'Search commands…'}
              aria-label="Search commands"
              role="combobox"
              aria-expanded
              aria-controls="command-list"
              className="flex-1 bg-transparent text-body-lg text-fg-primary outline-none placeholder:text-fg-muted [-webkit-app-region:no-drag]"
            />
          )}

          {showResult ? (
            <>
              <button
                type="button"
                onClick={() => setRaw((current) => !current)}
                aria-pressed={raw}
                aria-label={raw ? 'Show rendered markdown' : 'Edit raw text'}
                title={raw ? 'Rendered' : 'Edit raw text'}
                className="rounded-control p-1.5 text-fg-muted transition-colors duration-fast hover:bg-surface-hover hover:text-fg-primary [-webkit-app-region:no-drag]"
              >
                {raw ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setPinned((current) => !current)}
                aria-pressed={pinned}
                aria-label={pinned ? 'Unpin response' : 'Pin response'}
                title={pinned ? 'Pinned — new captures keep this answer' : 'Pin this answer'}
                className={cn(
                  'rounded-control p-1.5 transition-colors duration-fast hover:bg-surface-hover',
                  '[-webkit-app-region:no-drag]',
                  pinned ? 'text-accent' : 'text-fg-muted hover:text-fg-primary',
                )}
              >
                {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </button>
            </>
          ) : null}

          {settings.data ? (
            <Badge
              tone="neutral"
              className="shrink-0 gap-1.5"
              title={`${providerLabel} · ${settings.data.defaultModel}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              {settings.data.defaultModel}
            </Badge>
          ) : null}

          <button
            type="button"
            onClick={() => void openSettingsWindow()}
            aria-label="Open settings"
            className="rounded-control p-1.5 text-fg-muted transition-colors duration-fast hover:bg-surface-hover hover:text-fg-primary [-webkit-app-region:no-drag]"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void closeOverlay()}
            aria-label="Close"
            className="rounded-control p-1.5 text-fg-muted transition-colors duration-fast hover:bg-surface-hover hover:text-fg-primary [-webkit-app-region:no-drag]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {help ? (
            <motion.div
              key="help"
              variants={slideUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-h-[26rem] overflow-y-auto px-3.5 py-3"
            >
              <ShortcutList scope="popup" />
            </motion.div>
          ) : showResult ? (
            <motion.div
              key="result"
              variants={slideUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-0 flex-col gap-2 px-3.5 pb-3 pt-3"
            >
              {analysis ? <AnalysisChips analysis={analysis} /> : null}

              {promptDraft === null ? null : (
                // Re-word and re-run without walking back to the palette: the
                // command is already chosen, only its input is in question.
                <form
                  className="flex shrink-0 items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(lastRun.command, promptDraft);
                  }}
                >
                  <input
                    autoFocus
                    value={promptDraft}
                    onChange={(event) => setPromptDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        event.stopPropagation();
                        setPromptDraft(null);
                      }
                    }}
                    placeholder={lastRun.command.inputPlaceholder ?? 'Add to the instruction…'}
                    aria-label="Edit prompt"
                    className="flex-1 rounded-control border border-border bg-surface px-2.5 py-1.5 text-body outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                  <Button size="sm" type="submit" disabled={busy}>
                    Run
                  </Button>
                </form>
              )}

              {raw ? (
                <textarea
                  value={output}
                  onChange={(event) => setOutput(event.target.value)}
                  placeholder={busy ? 'Thinking…' : 'The model returned nothing.'}
                  aria-label="AI output"
                  rows={10}
                  className="min-h-[12rem] flex-1 resize-none rounded-card border border-border bg-surface p-3 font-mono text-body leading-relaxed outline-none transition-colors duration-fast focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              ) : (
                // The scroll lives here, not on the shell: the header and the
                // action bar stay put while a long answer moves under them.
                <div
                  aria-label="AI output"
                  aria-live="polite"
                  aria-busy={busy}
                  tabIndex={0}
                  className="min-h-[12rem] flex-1 overflow-y-auto rounded-card border border-border bg-surface p-3"
                >
                  {output.length > 0 ? (
                    // Plain text while the markdown chunk loads: the first
                    // tokens stay readable instead of blanking the panel.
                    <Suspense fallback={<p className="whitespace-pre-wrap text-body">{output}</p>}>
                      <ResponseMarkdown content={output} />
                    </Suspense>
                  ) : ai.error && !busy ? (
                    // The provider's own message is the description: "that did
                    // not go through" alone is not something anyone can act on.
                    <EmptyState kind="error" size="sm" description={ai.error.message} />
                  ) : busy ? (
                    // Before the first token there is nothing to stream, so the
                    // box shows the shape an answer will take rather than an
                    // empty panel with a caret blinking in the corner.
                    <div className="space-y-3">
                      <ThinkingIndicator phase="thinking" />
                      <SkeletonText lines={4} />
                    </div>
                  ) : (
                    <p className="text-body-lg text-fg-muted">The model returned nothing.</p>
                  )}
                  {busy && output.length > 0 ? <StreamCaret /> : null}
                </div>
              )}
            </motion.div>
          ) : blocked ? (
            <motion.div key="blocked" variants={slideUp} initial="hidden" animate="visible" exit="exit">
              {online ? (
                <EmptyState
                  kind="no-api-key"
                  size="sm"
                  description={`${activeProvider?.label ?? 'This provider'} has no key stored yet. Add one and every command here starts working.`}
                  action={
                    <Button size="sm" onClick={() => void openSettingsWindow()}>
                      Add a key
                    </Button>
                  }
                />
              ) : (
                // No action: the online/offline listener flips this back on its
                // own, so a Retry button would only be a button that waits.
                <EmptyState kind="offline" size="sm" />
              )}
            </motion.div>
          ) : mode === 'client-reply' ? (
            <motion.div key="client-reply" variants={slideUp} initial="hidden" animate="visible" exit="exit">
              <ClientReply
                message={selection}
                disabled={selection.trim().length === 0}
                onRun={(command) => void run(command, '')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="palette"
              variants={slideUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-0 flex-col"
            >
              <CommandPalette
                commands={commands}
                customPrompts={prompts}
                context={context}
                favorites={prefs.favorites}
                recents={prefs.recents}
                query={query}
                onToggleFavorite={prefs.toggleFavorite}
                onRun={(command, input) => void run(command, input)}
                disabled={selection.trim().length === 0 || help}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {errorMessage ? (
          <p className="shrink-0 px-3.5 pb-2 text-caption text-danger" role="status">
            {errorMessage}
          </p>
        ) : null}
        {degraded ? (
          <p className="shrink-0 px-3.5 pb-2 text-caption text-warning" role="status">
            No keystroke backend on this session ({capabilities.data?.displayServer ?? 'unknown'}) — install
            xdotool (X11) or ydotool (Wayland) to replace text automatically.
          </p>
        ) : null}
        {!showResult && !blocked && selection.trim().length === 0 ? (
          <p className="shrink-0 px-3.5 pb-2 text-caption text-fg-muted" role="status">
            Nothing selected yet — highlight text in any app, then press Recapture.
          </p>
        ) : null}

        <footer className="flex shrink-0 items-center gap-3 border-t border-border/70 px-3.5 py-2">
          {showResult ? (
            <>
              <div className="flex flex-1 items-center gap-1">
                {busy ? (
                  <Button size="sm" variant="ghost" onClick={() => ai.cancel()}>
                    Stop
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => void run(lastRun.command, lastRun.input)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPromptDraft((current) => (current === null ? lastRun.input : null))}
                  disabled={busy}
                  title="Reword the prompt and run it again"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Prompt
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void copy()} disabled={output.length === 0}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void write(true)}
                  disabled={busy || replace.isPending || output.length === 0}
                >
                  Insert below
                </Button>
              </div>
              <Latency busy={busy} ms={latencyMs} />
              <Button
                size="sm"
                onClick={() => void write(false)}
                disabled={busy || replace.isPending || output.trim().length === 0}
              >
                <CornerDownLeft className="h-3.5 w-3.5" />
                {replace.isPending ? 'Replacing…' : 'Replace'}
              </Button>
            </>
          ) : (
            <>
              {/* Three hints, not five: the footer is 560px wide and shares it
                  with the provider switch. Tab-by-section and Ctrl+D favourite
                  are in the docs, not on screen. */}
              <div className="flex flex-1 items-center gap-2.5 overflow-hidden text-caption text-fg-muted">
                <span className="flex shrink-0 items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  navigate
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Kbd>Enter</Kbd>
                  run
                </span>
                <span className="flex min-w-0 items-center gap-1 truncate">
                  <Kbd combo="Ctrl+K" />
                  search
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Kbd>F1</Kbd>
                  keys
                </span>
              </div>
              <Latency busy={busy} ms={latencyMs} />
              {/* Native select: it is the right menu on both Windows and GNOME,
                  and it costs no popover, portal or focus trap of our own. */}
              <label className="flex shrink-0 items-center gap-1 text-caption text-fg-muted">
                <span className="sr-only">Provider</span>
                <select
                  value={settings.data?.defaultProvider ?? ''}
                  disabled={switchProvider.isPending || selectableProviders.length === 0}
                  onChange={(event) => switchProvider.mutate(event.target.value as ProviderId)}
                  className="max-w-[9rem] cursor-pointer truncate rounded-control border border-border bg-surface px-2 py-1 text-caption text-fg-secondary outline-none transition-colors duration-fast hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {selectableProviders.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void onRecapture()}
                disabled={recapture.isPending}
              >
                {recapture.isPending ? 'Capturing…' : 'Recapture'}
              </Button>
            </>
          )}
        </footer>
      </motion.div>
    </div>
  );
}

/**
 * Round-trip time of the last call. Green under 1.5s, amber under 4s, red past
 * that — the number alone does not say whether the provider is behaving.
 */
function Latency({ busy, ms }: { readonly busy: boolean; readonly ms: number | null }): JSX.Element | null {
  if (busy) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-caption text-fg-muted" role="status">
        <motion.span
          variants={loadingPulse}
          animate="visible"
          className="h-1.5 w-1.5 rounded-full bg-accent"
          aria-hidden
        />
        running
      </span>
    );
  }
  if (ms === null) return null;
  const tone = ms < 1_500 ? 'bg-success' : ms < 4_000 ? 'bg-warning' : 'bg-danger';
  return (
    <span
      className="flex shrink-0 items-center gap-1.5 text-caption text-fg-muted"
      title="Last response time"
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tone)} aria-hidden />
      {ms < 1_000 ? `${Math.round(ms)} ms` : `${(ms / 1_000).toFixed(1)} s`}
    </span>
  );
}
