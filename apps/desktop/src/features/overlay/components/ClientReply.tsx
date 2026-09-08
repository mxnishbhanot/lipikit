import { useEffect, useRef, useState } from 'react';
import { REPLY_COMMANDS, type CommandDescriptor } from '@ai-anywhere/prompts';
import type { ReplyAnalysis } from '@ai-anywhere/shared';

export interface ClientReplyProps {
  readonly onRun: (command: CommandDescriptor) => void;
  readonly disabled: boolean;
  /** The client message, shown so the user can see what is being answered. */
  readonly message: string;
}

/**
 * The client-reply home screen: pick a voice, and the reply is generated.
 * Reached from the palette, or from the optional client-reply shortcut.
 * Styles are ordinary commands, so picking one goes through the same run /
 * retry / history path as everything in the palette.
 */
export function ClientReply({ onRun, disabled, message }: ClientReplyProps): JSX.Element {
  const [active, setActive] = useState(0);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => activeRef.current?.focus(), [active]);

  const onKeyDown = (event: React.KeyboardEvent): void => {
    const step = { ArrowRight: 1, ArrowDown: 2, ArrowLeft: -1, ArrowUp: -2 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    // Wraps, so the grid is navigable without hunting for its edges.
    setActive((current) => (current + step + REPLY_COMMANDS.length) % REPLY_COMMANDS.length);
  };

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 pb-2">
      <p className="max-h-24 shrink-0 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
        {message.trim().length > 0
          ? message
          : 'Nothing captured — select the client message, then recapture.'}
      </p>
      <p className="shrink-0 text-[11px] text-muted-foreground">Reply in which voice?</p>
      <div className="grid grid-cols-2 gap-1.5" role="listbox" aria-label="Reply style" onKeyDown={onKeyDown}>
        {REPLY_COMMANDS.map((command, index) => (
          <button
            key={command.id}
            ref={index === active ? activeRef : null}
            type="button"
            role="option"
            aria-selected={index === active}
            tabIndex={index === active ? 0 : -1}
            disabled={disabled}
            onFocus={() => setActive(index)}
            onClick={() => onRun(command)}
            className="rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          >
            {command.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const URGENCY_CLASS: Record<string, string> = {
  high: 'border-destructive/50 text-destructive',
  medium: 'border-border text-foreground',
  low: 'border-border text-muted-foreground',
};

/** What the model saw in the client's message, above the drafted reply. */
export function AnalysisChips({ analysis }: { readonly analysis: ReplyAnalysis }): JSX.Element | null {
  const chips: readonly { readonly key: string; readonly text: string; readonly className: string }[] = [
    ...(analysis.urgency === null
      ? []
      : [
          {
            key: 'urgency',
            text: `${analysis.urgency} urgency`,
            className: URGENCY_CLASS[analysis.urgency] ?? 'border-border',
          },
        ]),
    ...(analysis.sentiment === null
      ? []
      : [{ key: 'sentiment', text: analysis.sentiment, className: 'border-border text-muted-foreground' }]),
    ...analysis.categories.map((category) => ({
      key: `category:${category}`,
      text: category,
      className: 'border-border text-muted-foreground',
    })),
    ...(analysis.questions.length === 0
      ? []
      : [
          {
            key: 'questions',
            text: `${analysis.questions.length} question${analysis.questions.length === 1 ? '' : 's'}`,
            className: 'border-border text-muted-foreground',
          },
        ]),
  ];
  if (chips.length === 0) return null;

  return (
    <div className="flex shrink-0 flex-wrap gap-1" title={analysis.questions.join('\n')}>
      {chips.map((chip) => (
        <span key={chip.key} className={`rounded-full border px-2 py-0.5 text-[11px] ${chip.className}`}>
          {chip.text}
        </span>
      ))}
    </div>
  );
}
