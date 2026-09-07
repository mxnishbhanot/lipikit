import type { AppSettings } from '@ai-anywhere/shared';
import { Button } from '@ai-anywhere/ui';
import { useClearHistory, useDeleteHistoryEntry, useHistory } from '../../../history/api/history.queries.js';
import { MutationStatus, NumberField, Section, Toggle } from '../fields.js';

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
    <div className="space-y-8">
      <Section title="Recording">
        <Toggle
          label="Keep history"
          hint="Every rewrite is stored locally so you can find it again. Off means nothing new is written; existing entries stay until deleted."
          checked={settings.historyEnabled}
          onChange={(historyEnabled) => patch({ historyEnabled })}
        />
        <NumberField
          label="Keep for (days)"
          hint="Older entries are deleted when the app starts."
          value={settings.historyRetentionDays}
          min={1}
          max={3_650}
          onCommit={(historyRetentionDays) => patch({ historyRetentionDays })}
        />
      </Section>

      <Section title="Entries">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={clear.isPending || history.data?.length === 0}
            onClick={() => clear.mutate()}
          >
            Delete all history
          </Button>
          <MutationStatus error={clear.error ?? remove.error} />
        </div>

        {history.isPending ? <p className="text-xs text-muted-foreground">Loading…</p> : null}
        {history.isError ? <MutationStatus error={history.error} /> : null}
        {history.data?.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing yet. Rewrites will show up here.</p>
        ) : null}

        <div className="space-y-2">
          {history.data?.map((entry) => (
            <div key={entry.id} className="rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs uppercase text-muted-foreground">
                  {entry.action} · {entry.providerId} · {entry.model}
                  {entry.appName === null ? '' : ` · ${entry.appName}`}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">{when(entry.createdAt)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(entry.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">{entry.output}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
