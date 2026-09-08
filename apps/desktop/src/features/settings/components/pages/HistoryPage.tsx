import type { AppSettings } from '@ai-anywhere/shared';
import { Badge, Button, EmptyState } from '@ai-anywhere/ui';
import { Trash2 } from 'lucide-react';
import { useClearHistory, useDeleteHistoryEntry, useHistory } from '../../../history/api/history.queries.js';
import { Group, MutationStatus, NumberRow, Row, SettingsPage, ToggleRow } from '../fields.js';

const when = (timestamp: number): string => new Date(timestamp).toLocaleString();

export function HistoryPage({
  settings,
  patch,
}: {
  settings: AppSettings;
  patch: (value: Partial<AppSettings>) => void;
}): JSX.Element {
  const history = useHistory(50, 0);
  const clear = useClearHistory();
  const remove = useDeleteHistoryEntry();

  return (
    <SettingsPage
      title="History"
      description="Every rewrite is stored locally so you can find it again. It never leaves this machine."
    >
      <Group title="Recording">
        <ToggleRow
          label="Keep history"
          hint="Off means nothing new is written; existing entries stay until deleted."
          checked={settings.historyEnabled}
          onChange={(historyEnabled) => patch({ historyEnabled })}
        />
        <NumberRow
          label="Keep for"
          hint="Older entries are deleted when the app starts."
          value={settings.historyRetentionDays}
          min={1}
          max={3_650}
          suffix="days"
          onCommit={(historyRetentionDays) => patch({ historyRetentionDays })}
        />
        <Row label="Delete all history" hint="Local data only, and it cannot be undone.">
          <Button
            size="sm"
            variant="destructive"
            disabled={clear.isPending || history.data?.length === 0}
            onClick={() => clear.mutate()}
          >
            Delete all
          </Button>
        </Row>
        <MutationStatus error={clear.error ?? remove.error} />
      </Group>

      <Group title="Recent" description="The last 50 entries.">
        {history.isPending ? <Row label="Loading…" /> : null}
        {history.isError ? <MutationStatus error={history.error} /> : null}
        {history.data?.length === 0 ? (
          <EmptyState
            kind="no-history"
            size="sm"
            {...(settings.historyEnabled
              ? {}
              : {
                  title: 'History is off',
                  description: 'Turn "Keep history" on above and answers start being saved here.',
                })}
          />
        ) : null}
        {history.data?.map((entry) => (
          <div key={entry.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <Badge tone="accent">{entry.action}</Badge>
                <span className="text-caption text-fg-muted">
                  {entry.providerId} · {entry.model}
                  {entry.appName === null ? '' : ` · ${entry.appName}`}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-caption tabular-nums text-fg-muted">{when(entry.createdAt)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Delete entry"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(entry.id)}
                >
                  <Trash2 aria-hidden className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-body text-fg-secondary">
              {entry.output}
            </p>
          </div>
        ))}
      </Group>
    </SettingsPage>
  );
}
