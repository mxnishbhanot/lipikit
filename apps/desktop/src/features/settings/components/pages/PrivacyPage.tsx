import type { AppSettings } from '@ai-anywhere/shared';
import { Button } from '@ai-anywhere/ui';
import { ShieldCheck, Trash2 } from 'lucide-react';
import {
  useClearClipboardHistory,
  useClipboardHistory,
  useDeleteClipboardEntry,
} from '../../api/clipboard.queries.js';
import { useClearHistory } from '../../../history/api/history.queries.js';
import { Group, MutationStatus, NumberRow, Row, SettingsPage, ToggleRow } from '../fields.js';

const when = (timestamp: number): string => new Date(timestamp).toLocaleString();

export function PrivacyPage({
  settings,
  patch,
}: {
  settings: AppSettings;
  patch: (value: Partial<AppSettings>) => void;
}): JSX.Element {
  const clipboard = useClipboardHistory(50, 0);
  const removeEntry = useDeleteClipboardEntry();
  const clearClipboard = useClearClipboardHistory();
  const clearHistory = useClearHistory();

  return (
    <SettingsPage
      title="Privacy"
      description="Only the text of the action you run leaves this machine, sent to the provider you chose. Nothing is sent to us: there is no account and no telemetry."
    >
      <Group title="What leaves this machine">
        <ToggleRow
          label="Conversation memory"
          hint="Sends the last 20 stored interactions to the provider as context for client replies. Off by default; needs history enabled."
          checked={settings.conversationMemoryEnabled}
          disabled={!settings.historyEnabled}
          onChange={(conversationMemoryEnabled) => patch({ conversationMemoryEnabled })}
        />
        <div className="flex gap-3 px-4 py-3.5">
          <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p className="max-w-prose text-caption leading-relaxed text-fg-muted">
            API keys are encrypted by the OS keyring and stored outside the database, so a copied database
            file never contains a credential — and neither does an export.
          </p>
        </div>
      </Group>

      <Group
        title="Clipboard history"
        description="Off by default. While it is on, everything you copy in any app is recorded locally, including passwords a password manager puts on the clipboard."
      >
        <ToggleRow
          label="Record clipboard"
          checked={settings.clipboardHistoryEnabled}
          onChange={(clipboardHistoryEnabled) => patch({ clipboardHistoryEnabled })}
        />
        <NumberRow
          label="Entries to keep"
          hint="The oldest are dropped past this."
          value={settings.clipboardHistoryLimit}
          min={1}
          max={1_000}
          suffix="entries"
          onCommit={(clipboardHistoryLimit) => patch({ clipboardHistoryLimit })}
        />
        {clipboard.data?.length === 0 ? (
          <Row
            label={settings.clipboardHistoryEnabled ? 'Nothing recorded yet' : 'Recording is off'}
            hint={settings.clipboardHistoryEnabled ? 'Copies will show up here.' : 'Turn it on above.'}
          />
        ) : null}
        {clipboard.data?.map((entry) => (
          <div key={entry.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3 text-caption text-fg-muted">
              <span className="truncate">
                {entry.appName ?? 'unknown app'} · {when(entry.createdAt)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Delete entry"
                disabled={removeEntry.isPending}
                onClick={() => removeEntry.mutate(entry.id)}
              >
                <Trash2 aria-hidden className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-body text-fg-secondary">{entry.text}</p>
          </div>
        ))}
        <MutationStatus error={clearClipboard.error ?? removeEntry.error} />
      </Group>

      <Group title="Delete everything" description="Local data only, and it cannot be undone.">
        <Row label="Conversation history" hint="Every stored rewrite, input and output.">
          <Button
            size="sm"
            variant="destructive"
            disabled={clearHistory.isPending}
            onClick={() => clearHistory.mutate()}
          >
            Delete
          </Button>
        </Row>
        <Row label="Clipboard history" hint="Everything recorded from the clipboard.">
          <Button
            size="sm"
            variant="destructive"
            disabled={clearClipboard.isPending || clipboard.data?.length === 0}
            onClick={() => clearClipboard.mutate()}
          >
            Delete
          </Button>
        </Row>
        <MutationStatus error={clearHistory.error} />
      </Group>
    </SettingsPage>
  );
}
