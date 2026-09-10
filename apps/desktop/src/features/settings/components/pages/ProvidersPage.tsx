import { useState } from 'react';
import { Badge, Button, Input, Spinner, Switch, cn } from '@lipikit/ui';
import type { AppSettings, ProviderDescriptor, ProviderId } from '@lipikit/shared';
import { Check, ExternalLink, KeyRound, Plug, Trash2 } from 'lucide-react';
import {
  useDeleteApiKey,
  useHasApiKey,
  useHealthCheck,
  useProviderSettings,
  useProviders,
  useSaveApiKey,
  useUpdateProviderSettings,
} from '../../api/settings.queries.js';
import { Group, MutationStatus, Row, SettingsPage } from '../fields.js';

/** Key entry, health probe and endpoint override for one provider. */
function ProviderCard({
  descriptor,
  isDefault,
  enabled,
  baseUrl,
}: {
  descriptor: ProviderDescriptor;
  isDefault: boolean;
  enabled: boolean;
  baseUrl: string | null;
}): JSX.Element {
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState(baseUrl ?? '');
  const hasKey = useHasApiKey(descriptor.id);
  const save = useSaveApiKey();
  const remove = useDeleteApiKey();
  const health = useHealthCheck();
  const update = useUpdateProviderSettings();

  // Three states, not two: "still asking the keyring" must not read as
  // "no key", or the card tells the user to paste one they already stored.
  const keyStatus = !descriptor.requiresApiKey
    ? { tone: 'neutral' as const, label: 'No key needed' }
    : hasKey.isPending
      ? { tone: 'neutral' as const, label: 'Checking…' }
      : hasKey.data
        ? { tone: 'success' as const, label: 'Key stored' }
        : { tone: 'warning' as const, label: 'No key' };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-card border bg-surface shadow-sm transition-colors duration-fast',
        enabled ? 'border-border' : 'border-border/60 opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-body font-medium">{descriptor.label}</h4>
            {isDefault ? <Badge tone="accent">Default</Badge> : null}
            <Badge tone={keyStatus.tone}>
              {keyStatus.tone === 'success' ? <Check aria-hidden className="h-3 w-3" /> : null}
              {keyStatus.label}
            </Badge>
          </div>
          <p className="mt-1 truncate text-caption text-fg-muted">{baseUrl ?? descriptor.baseUrl}</p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-caption text-fg-muted">
          Enabled
          <Switch
            aria-label={`${descriptor.label} enabled`}
            checked={enabled}
            // The default provider cannot be switched off from under the
            // hotkey: pick a different default first.
            disabled={isDefault || update.isPending}
            onChange={(event) => update.mutate({ providerId: descriptor.id, enabled: event.target.checked })}
          />
        </label>
      </div>

      <div className="divide-y divide-border">
        {descriptor.requiresApiKey ? (
          <Row
            label="API key"
            hint={
              descriptor.apiKeyUrl === null ? (
                'Verified against the provider before it is stored.'
              ) : (
                <>
                  Verified before it is stored.{' '}
                  <a
                    className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline"
                    href={descriptor.apiKeyUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Get a key <ExternalLink aria-hidden className="h-3 w-3" />
                  </a>
                </>
              )
            }
            stack
          >
            <div className="flex w-full gap-2">
              <Input
                type="password"
                className="h-8 flex-1 text-caption"
                value={apiKey}
                autoComplete="off"
                aria-label={`${descriptor.label} API key`}
                placeholder={hasKey.data ? 'stored in the OS keyring' : 'paste key…'}
                onChange={(event) => setApiKey(event.target.value)}
              />
              <Button
                size="sm"
                disabled={apiKey.trim().length === 0 || save.isPending}
                onClick={() => {
                  save.mutate({ providerId: descriptor.id, apiKey }, { onSuccess: () => setApiKey('') });
                }}
              >
                {save.isPending ? <Spinner size="sm" /> : <KeyRound aria-hidden className="h-3.5 w-3.5" />}
                {save.isPending ? 'Checking…' : 'Save'}
              </Button>
              {hasKey.data ? (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Remove stored key"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(descriptor.id)}
                >
                  <Trash2 aria-hidden className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </Row>
        ) : null}

        <Row label="Endpoint" hint="Leave empty for the vendor default. Must be an http(s) URL." stack>
          <div className="flex w-full gap-2">
            <Input
              className="h-8 flex-1 text-caption"
              value={endpoint}
              aria-label={`${descriptor.label} endpoint`}
              placeholder={descriptor.baseUrl}
              onChange={(event) => setEndpoint(event.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={update.isPending || endpoint.trim() === (baseUrl ?? '')}
              onClick={() => update.mutate({ providerId: descriptor.id, baseUrl: endpoint })}
            >
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={health.isPending}
              onClick={() => health.mutate(descriptor.id)}
            >
              <Plug aria-hidden className="h-3.5 w-3.5" />
              {health.isPending ? 'Testing…' : 'Test'}
            </Button>
          </div>
        </Row>
      </div>

      <MutationStatus
        error={save.error ?? health.error ?? update.error ?? remove.error}
        success={
          save.isSuccess ? 'Key verified and stored.' : health.isSuccess ? 'Provider reachable.' : null
        }
      />
    </div>
  );
}

export function ProvidersPage({ settings }: { settings: AppSettings }): JSX.Element {
  const providers = useProviders();
  const overrides = useProviderSettings();
  const rowFor = (providerId: ProviderId) =>
    overrides.data?.find((row) => row.providerId === providerId) ?? null;

  return (
    <SettingsPage
      title="Providers"
      description="API keys are encrypted by the OS keyring (DPAPI on Windows, libsecret on Linux) and never stored in the database or exported."
    >
      <Group flush>
        {providers.isError ? <MutationStatus error={providers.error} /> : null}
        {(providers.data ?? []).map((descriptor) => (
          <ProviderCard
            key={descriptor.id}
            descriptor={descriptor}
            isDefault={descriptor.id === settings.defaultProvider}
            enabled={rowFor(descriptor.id)?.enabled ?? true}
            baseUrl={rowFor(descriptor.id)?.baseUrl ?? null}
          />
        ))}
      </Group>
    </SettingsPage>
  );
}
