import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@ai-anywhere/ui';
import { ArrowLeft, Check, Copy, CornerDownLeft, RotateCcw, X } from 'lucide-react';
import { mergeCommands, parseReply, resolveInstruction, type PaletteCommand } from '@ai-anywhere/prompts';
import {
  IPC_EVENTS,
  type AppContext,
  type AppError,
  type OverlayMode,
  type ReplyAnalysis,
  type SelectionSource,
} from '@ai-anywhere/shared';
import { ipcOn } from '../../../lib/ipc-client.js';
import {
  closeOverlay,
  useCapabilities,
  useCaptureSelection,
  useReplaceSelection,
} from '../api/overlay.queries.js';
import { useGenerate } from '../api/ai.queries.js';
import { useCustomPrompts } from '../../prompts/api/prompts.queries.js';
import { useCommandPrefs } from '../use-command-prefs.js';
import { CommandPalette } from './CommandPalette.js';
import { AnalysisChips, ClientReply } from './ClientReply.js';

/** What was last run, so Retry needs no re-pick and no re-typing. */
interface LastRun {
  readonly command: PaletteCommand;
  readonly input: string;
}

/**
 * The popup that opens at the cursor after the hotkey: pick a command from the
 * palette, watch the answer stream in, then write it back over the original
 * selection — or copy it, or insert it underneath.
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
  // Which hotkey opened the popup: Ctrl+Space lands on the palette,
  // Ctrl+Shift+R on the reply-style picker.
  const [mode, setMode] = useState<OverlayMode>('palette');
  const [analysis, setAnalysis] = useState<ReplyAnalysis | null>(null);

  const capabilities = useCapabilities();
  const ai = useGenerate();
  const { reset: resetAi, run: runAi } = ai;
  const replace = useReplaceSelection();
  const recapture = useCaptureSelection();
  const prefs = useCommandPrefs();
  const customPrompts = useCustomPrompts();
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

  const reset = useCallback(() => {
    setLastRun(null);
    setOutput('');
    setAnalysis(null);
    setCopied(false);
    resetAi();
    resetReplace();
  }, [resetAi, resetReplace]);

  useEffect(() => {
    const unsubscribeCaptured = ipcOn(IPC_EVENTS.selectionCaptured, (captured) => {
      setCaptureError(null);
      reset();
      setSource(captured.source);
      setSelection(captured.text);
    });
    const unsubscribeContext = ipcOn(IPC_EVENTS.contextDetected, setContext);
    const unsubscribeHotkey = ipcOn(IPC_EVENTS.hotkeyTriggered, (press) => {
      // Pressing the other hotkey while the popup is open switches screens
      // rather than stacking a second result on top of the first.
      setMode(press.mode);
      reset();
    });
    const unsubscribeFailed = ipcOn(IPC_EVENTS.selectionCaptureFailed, (error) => {
      setSource(null);
      setSelection('');
      reset();
      setCaptureError(error);
    });
    return () => {
      unsubscribeCaptured();
      unsubscribeContext();
      unsubscribeHotkey();
      unsubscribeFailed();
    };
  }, [reset]);

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
      setLastRun({ command, input });
      remember({ commandId: command.id, input });
      const instruction = resolveInstruction(command, input);
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

  const back = useCallback((): void => {
    ai.cancel();
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
      if (event.key === 'Escape') {
        event.preventDefault();
        // In the result view Escape steps back to the palette; only from the
        // palette itself does it dismiss the popup.
        if (showResult) back();
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
  }, [showResult, back, write, ai.isPending]);

  const onRecapture = async (): Promise<void> => {
    const captured = await recapture.mutateAsync();
    setCaptureError(null);
    reset();
    setSource(captured.source);
    setSelection(captured.text);
  };

  const degraded = capabilities.data && !capabilities.data.canReplaceText;
  const busy = ai.isPending;

  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
      <header className="flex shrink-0 items-center gap-2 px-3 py-2">
        {showResult ? (
          <button
            type="button"
            onClick={back}
            aria-label="Back to commands"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <span className="flex-1 truncate text-xs text-muted-foreground">
          {showResult
            ? lastRun.command.label
            : mode === 'client-reply'
              ? 'Client reply'
              : (context?.label ?? source?.appName ?? 'AI Anywhere')}
          {!showResult && context?.domain !== null && context?.domain !== undefined
            ? ` · ${context.domain}`
            : ''}
          {selection.length > 0 ? ` · ${selection.length} chars selected` : ''}
        </span>
        <button
          type="button"
          onClick={() => void closeOverlay()}
          aria-label="Close"
          className="rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {showResult ? (
        <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 pb-2">
          {analysis ? <AnalysisChips analysis={analysis} /> : null}
          <textarea
            value={output}
            onChange={(event) => setOutput(event.target.value)}
            placeholder={busy ? 'Thinking…' : 'The model returned nothing.'}
            aria-label="AI output"
            className="flex-1 resize-none rounded-lg border border-input bg-background p-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      ) : mode === 'client-reply' ? (
        <ClientReply
          message={selection}
          disabled={selection.trim().length === 0}
          onRun={(command) => void run(command, '')}
        />
      ) : (
        <CommandPalette
          commands={commands}
          customPrompts={prompts}
          context={context}
          favorites={prefs.favorites}
          recents={prefs.recents}
          onToggleFavorite={prefs.toggleFavorite}
          onRun={(command, input) => void run(command, input)}
          disabled={selection.trim().length === 0}
        />
      )}

      {captureError ? (
        <p className="shrink-0 px-3 pb-1 text-xs text-destructive" role="status">
          {captureError.message}
        </p>
      ) : null}
      {ai.error ? (
        <p className="shrink-0 px-3 pb-1 text-xs text-destructive" role="status">
          {ai.error.message}
        </p>
      ) : null}
      {replace.isError ? (
        <p className="shrink-0 px-3 pb-1 text-xs text-destructive" role="status">
          {replace.error.message}
        </p>
      ) : null}
      {degraded ? (
        <p className="shrink-0 px-3 pb-1 text-[11px] text-muted-foreground" role="status">
          No keystroke backend on this session ({capabilities.data?.displayServer ?? 'unknown'}) — install
          xdotool (X11) or ydotool (Wayland) to replace text automatically.
        </p>
      ) : null}

      {showResult ? (
        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2">
          <div className="flex gap-1">
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
          <Button
            size="sm"
            onClick={() => void write(false)}
            disabled={busy || replace.isPending || output.trim().length === 0}
          >
            <CornerDownLeft className="h-3.5 w-3.5" />
            {replace.isPending ? 'Replacing…' : 'Replace'}
          </Button>
        </footer>
      ) : (
        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-1.5">
          <span className="truncate text-[11px] text-muted-foreground">
            {selection.trim().length === 0 ? 'Nothing captured — select text, then recapture.' : ''}
          </span>
          <Button size="sm" variant="ghost" onClick={() => void onRecapture()} disabled={recapture.isPending}>
            {recapture.isPending ? 'Capturing…' : 'Recapture'}
          </Button>
        </footer>
      )}
    </div>
  );
}
