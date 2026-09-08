import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BRANDING, IPC } from '@ai-anywhere/shared';
import { Button, Input, cn } from '@ai-anywhere/ui';
import { Bug, Camera, Clipboard, ExternalLink, FileText, Lightbulb } from 'lucide-react';
import { ipcInvoke } from '../../../../lib/ipc-client.js';
import {
  buildIssueMarkdown,
  emptyDraft,
  issueUrl,
  type FeedbackDraft,
  type ReportKind,
} from '../../../feedback/issue-markdown.js';
import { Group, MutationStatus, Row, SettingsPage } from '../fields.js';

const textareaClass = cn(
  'w-full rounded-control border border-border bg-surface px-2.5 py-2 text-body text-fg-primary',
  'transition-colors duration-fast ease-calm placeholder:text-fg-muted',
  'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
);

function Field({
  label,
  hint,
  value,
  rows,
  placeholder,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  rows: number;
  placeholder?: string;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <Row label={label} stack {...(hint === undefined ? {} : { hint })}>
      <textarea
        aria-label={label}
        rows={rows}
        value={value}
        placeholder={placeholder ?? ''}
        className={textareaClass}
        onChange={(event) => onChange(event.target.value)}
      />
    </Row>
  );
}

/**
 * Beta feedback, entirely local: the app posts nothing anywhere. The page
 * assembles the report the maintainers need — issue markdown, diagnostics, a
 * screenshot, a log file — and the user is the one who sends it. That is what
 * keeps "no telemetry by default" true with a feedback page in the app.
 */
export function FeedbackPage(): JSX.Element {
  const [draft, setDraft] = useState<FeedbackDraft>(() => emptyDraft('bug'));
  const patch = (value: Partial<FeedbackDraft>): void => setDraft((current) => ({ ...current, ...value }));
  const bug = draft.kind === 'bug';

  // Fetched once and shown, not silently attached: the user sees exactly what
  // the report will carry about their machine before anything is copied.
  const diagnostics = useQuery({
    queryKey: ['feedback', 'diagnostics'],
    queryFn: () => ipcInvoke(IPC.feedback.diagnostics, undefined),
    staleTime: Infinity,
  });

  const copy = useMutation({
    mutationFn: (text: string) => navigator.clipboard.writeText(text),
  });
  const screenshot = useMutation({
    mutationFn: () => ipcInvoke(IPC.feedback.screenshot, undefined),
    onSuccess: (path) => {
      if (path !== null) patch({ screenshotPath: path });
    },
  });
  const logs = useMutation({
    mutationFn: () => ipcInvoke(IPC.feedback.exportLogs, undefined),
    onSuccess: (path) => {
      if (path !== null) patch({ logPath: path });
    },
  });

  const withDiagnostics: FeedbackDraft = { ...draft, diagnostics: diagnostics.data ?? '' };
  const markdown = buildIssueMarkdown(withDiagnostics);

  return (
    <SettingsPage
      title="Beta feedback"
      description="Nothing here is sent automatically — the app has no account and no telemetry. Fill this in, then copy the issue or open it prefilled in your browser."
      actions={
        <div className="flex gap-1 rounded-control border border-border bg-surface p-0.5">
          {(
            [
              ['bug', 'Bug', Bug],
              ['feature', 'Feature', Lightbulb],
            ] as const satisfies readonly (readonly [ReportKind, string, typeof Bug])[]
          ).map(([kind, label, Icon]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={draft.kind === kind}
              onClick={() => patch({ kind })}
              className={cn(
                'flex items-center gap-1.5 rounded-control px-2.5 py-1 text-caption',
                draft.kind === kind
                  ? 'bg-accent-subtle font-medium text-accent'
                  : 'text-fg-secondary hover:bg-surface-hover',
              )}
            >
              <Icon aria-hidden className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      }
    >
      <Group title={bug ? 'The bug' : 'The request'}>
        <Row label="Title" stack>
          <Input
            aria-label="Title"
            value={draft.title}
            placeholder={bug ? 'Hotkey stops working after suspend' : 'Pin a prompt to the tray'}
            onChange={(event) => patch({ title: event.target.value })}
          />
        </Row>
        <Field
          label={bug ? 'What happened' : 'What you want'}
          rows={4}
          value={draft.body}
          placeholder={bug ? 'The popup no longer opens…' : 'It would help if…'}
          onChange={(body) => patch({ body })}
        />
        {bug ? (
          <Field
            label="Steps to reproduce"
            hint="One per line. This is the single most useful thing in a report."
            rows={4}
            value={draft.steps}
            onChange={(steps) => patch({ steps })}
          />
        ) : null}
        {bug ? (
          <Field
            label="Expected instead"
            rows={2}
            value={draft.expected}
            onChange={(expected) => patch({ expected })}
          />
        ) : null}
      </Group>

      <Group
        title="Attachments"
        description="Both are saved where you choose and referenced by path in the issue — attach the files yourself when you post it."
      >
        <Row label="Screenshot" hint={draft.screenshotPath ?? 'Captures this window as a PNG.'}>
          <Button
            size="sm"
            variant="outline"
            disabled={screenshot.isPending}
            onClick={() => screenshot.mutate()}
          >
            <Camera aria-hidden className="h-3.5 w-3.5" />
            {draft.screenshotPath === null ? 'Capture' : 'Recapture'}
          </Button>
        </Row>
        <Row
          label="Logs"
          hint={
            draft.logPath ??
            'The last 500 log lines from this session. Never written to disk unless you export them.'
          }
        >
          <Button size="sm" variant="outline" disabled={logs.isPending} onClick={() => logs.mutate()}>
            <FileText aria-hidden className="h-3.5 w-3.5" />
            Export
          </Button>
        </Row>
        <MutationStatus error={screenshot.error ?? logs.error} />
      </Group>

      <Group
        title="Diagnostics"
        description="Versions, backends and which settings are on. No keys, no history, no text you rewrote."
      >
        <div className="px-4 py-3.5">
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-control bg-background p-3 text-caption text-fg-secondary">
            {diagnostics.data ?? (diagnostics.error ? diagnostics.error.message : 'Reading…')}
          </pre>
        </div>
        <Row label="Copy diagnostics" hint="Paste into an existing issue or an email.">
          <Button
            size="sm"
            variant="outline"
            disabled={!diagnostics.data}
            onClick={() => copy.mutate(diagnostics.data ?? '')}
          >
            <Clipboard aria-hidden className="h-3.5 w-3.5" />
            Copy
          </Button>
        </Row>
      </Group>

      <Group title="Send it" description={`Issues live at ${BRANDING.issuesUrl}.`}>
        <div className="px-4 py-3.5">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-control bg-background p-3 text-caption text-fg-secondary">
            {markdown}
          </pre>
        </div>
        <Row label="GitHub issue markdown" hint="The text above, ready to paste.">
          <Button size="sm" variant="outline" onClick={() => copy.mutate(markdown)}>
            <Clipboard aria-hidden className="h-3.5 w-3.5" />
            Copy markdown
          </Button>
        </Row>
        <Row
          label="Open a prefilled issue"
          hint="Opens your browser with the title and body already filled in."
        >
          <a
            href={issueUrl(withDiagnostics)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-body text-accent hover:underline"
          >
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            Open GitHub
          </a>
        </Row>
        <Row label="Prefer email?" hint="Same text, sent to support instead.">
          <a href={`mailto:${BRANDING.supportEmail}`} className="text-body text-accent hover:underline">
            {BRANDING.supportEmail}
          </a>
        </Row>
        <MutationStatus error={copy.error} success={copy.isSuccess ? 'Copied to the clipboard.' : null} />
      </Group>
    </SettingsPage>
  );
}
