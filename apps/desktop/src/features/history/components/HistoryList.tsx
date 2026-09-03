import { Button, Card, CardContent, CardHeader, CardTitle } from '@ai-anywhere/ui';
import { useClearHistory, useHistory } from '../api/history.queries.js';

export function HistoryList(): JSX.Element {
  const history = useHistory();
  const clear = useClearHistory();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>History</CardTitle>
        <Button size="sm" variant="outline" onClick={() => clear.mutate()} disabled={clear.isPending}>
          Clear
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {history.isPending ? <p className="text-muted-foreground">Loading…</p> : null}
        {history.isError ? <p className="text-destructive">{history.error.message}</p> : null}
        {history.data?.length === 0 ? (
          <p className="text-muted-foreground">Nothing yet. Rewrites will show up here.</p>
        ) : null}
        {history.data?.map((entry) => (
          <div key={entry.id} className="rounded-md border border-border p-3">
            <div className="text-xs uppercase text-muted-foreground">
              {entry.action} · {entry.providerId}
            </div>
            <p className="mt-1 line-clamp-2">{entry.output}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
