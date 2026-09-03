import { Button, Card, CardContent, CardHeader, CardTitle } from '@ai-anywhere/ui';
import type { Tone } from '@ai-anywhere/shared';
import { useProviders, useSettings, useUpdateSettings } from '../api/settings.queries.js';

const TONES: readonly Tone[] = ['neutral', 'formal', 'casual', 'friendly', 'confident', 'concise'];

export function SettingsPanel(): JSX.Element {
  const settings = useSettings();
  const providers = useProviders();
  const update = useUpdateSettings();

  if (settings.isPending) return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  if (settings.isError) return <p className="text-sm text-destructive">{settings.error.message}</p>;

  const current = settings.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Global hotkey</span>
          <code className="rounded bg-muted px-2 py-1">{current.globalHotkey}</code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Provider</span>
          <span>
            {providers.data?.find((p) => p.id === current.defaultProvider)?.label ?? current.defaultProvider}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TONES.map((tone) => (
            <Button
              key={tone}
              size="sm"
              variant={tone === current.defaultTone ? 'default' : 'outline'}
              disabled={update.isPending}
              onClick={() => update.mutate({ defaultTone: tone })}
            >
              {tone}
            </Button>
          ))}
        </div>
        {update.isError ? <p className="text-destructive">{update.error.message}</p> : null}
      </CardContent>
    </Card>
  );
}
