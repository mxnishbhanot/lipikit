import type { AppSettings } from '@ai-anywhere/shared';
import { Button } from '@ai-anywhere/ui';
import {
  useClearClipboardHistory,
  useClipboardHistory,
  useDeleteClipboardEntry,
} from '../../api/clipboard.queries.js';
import { useClearHistory } from '../../../history/api/history.queries.js';
import { MutationStatus, NumberField, Section, Toggle } from '../fields.js';

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
    <div className="space-y-8">
      <Section
        title="What leaves this machine"
        description="Only the text of the action you run, sent to the provider you chose. Nothing is sent to us: there is no account and no telemetry."
      >
        <Toggle
          label="Conversation memory"
          hint="Sends the last 20 stored interactions to the provider as context for client replies. Off by default; needs history enabled."
          checked={settings.conversationMemoryEnabled}
          disabled={!settings.historyEnabled}
          onChange={(conversationMemoryEnabled) => patch({ conversationMemoryEnabled })}
        />
        <p className="text-xs text-muted-foreground">
          API keys are encrypted by the OS keyring and stored outside the database, so a copied database file
          never contains a credential — and neither does an export.
        </p>
      </Section>

      <Section
        title="Clipboard history"
        description="Off by default. While it is on, everything you copy in any app is recorded locally, including passwords a password manager puts on the clipboard."
      >
        <Toggle
          label="Record clipboard"
          checked={settings.clipboardHistoryEnabled}
          onChange={(clipboardHistoryEnabled) => patch({ clipboardHistoryEnabled })}
        />
        <NumberField
          label="Entries to keep"
          hint="The oldest are dropped past this."
          value={settings.clipboardHistoryLimit}
          min={1}
          max={1_000}
          onCommit={(clipboardHistoryLimit) => patch({ clipboardHistoryLimit })}
        />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={clearClipboard.isPending || clipboard.data?.length === 0}
            onClick={() => clearClipboard.mutate()}
          >
            Delete clipboard history
          </Button>
          <MutationStatus error={clearClipboard.error ?? removeEntry.error} />
        </div>

        {clipboard.data?.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {settings.clipboardHistoryEnabled ? 'Nothing recorded yet.' : 'Recording is off.'}
          </p>
        ) : null}
        <div className="space-y-2">
          {clipboard.data?.map((entry) => (
            <div key={entry.id} className="rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {entry.appName ?? 'unknown app'} · {when(entry.createdAt)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={removeEntry.isPending}
                  onClick={() => removeEntry.mutate(entry.id)}
                >
                  Delete
                </Button>
              </div>
              <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm">{entry.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Delete everything" description="Local data only, and it cannot be undone.">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={clearHistory.isPending}
            onClick={() => clearHistory.mutate()}
          >
            Delete conversation history
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={clearClipboard.isPending}
            onClick={() => clearClipboard.mutate()}
          >
            Delete clipboard history
          </Button>
        </div>
        <MutationStatus error={clearHistory.error} />
      </Section>
    </div>
  );
}
