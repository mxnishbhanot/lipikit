import { useState } from 'react';
import { Button } from '@ai-anywhere/ui';
import type { AppSettings, ProviderDescriptor, ProviderId } from '@ai-anywhere/shared';
import {
  useDeleteApiKey,
  useHasApiKey,
  useHealthCheck,
  useProviderSettings,
  useProviders,
  useSaveApiKey,
  useUpdateProviderSettings,
} from '../../api/settings.queries.js';
import { FIELD, MutationStatus, Row, Section } from '../fields.js';

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

  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">
            {descriptor.label}
            {isDefault ? <span className="text-muted-foreground"> · default</span> : null}
          </h4>
          <p className="text-xs text-muted-foreground">
            {baseUrl ?? descriptor.baseUrl}
            {descriptor.requiresApiKey ? '' : ' · no API key needed'}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Enabled
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={enabled}
            // The default provider cannot be switched off from under the
            // hotkey: pick a different default first.
            disabled={isDefault || update.isPending}
            onChange={(event) => update.mutate({ providerId: descriptor.id, enabled: event.target.checked })}
          />
        </label>
      </div>

      {descriptor.requiresApiKey ? (
        <>
          <Row label="API key">
            <div className="flex gap-2">
              <input
                type="password"
                className={FIELD}
                value={apiKey}
                autoComplete="off"
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
                {save.isPending ? 'Checking…' : 'Save'}
              </Button>
            </div>
          </Row>
          {descriptor.apiKeyUrl === null ? null : (
            <p className="pl-[12.75rem] text-xs text-muted-foreground">
              Keys:{' '}
              <a className="underline" href={descriptor.apiKeyUrl} target="_blank" rel="noreferrer">
                {descriptor.apiKeyUrl}
              </a>
            </p>
          )}
        </>
      ) : null}

      <Row label="Endpoint override" hint="Leave empty for the vendor default. Must be an http(s) URL.">
        <div className="flex gap-2">
          <input
            className={FIELD}
            value={endpoint}
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
        </div>
      </Row>

      <div className="flex flex-wrap items-center gap-2 pl-[12.75rem] text-xs">
        <Button
          size="sm"
          variant="outline"
          disabled={health.isPending}
          onClick={() => health.mutate(descriptor.id)}
        >
          {health.isPending ? 'Testing…' : 'Test connection'}
        </Button>
        {hasKey.data ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={remove.isPending}
            onClick={() => remove.mutate(descriptor.id)}
          >
            Remove key
          </Button>
        ) : null}
        <MutationStatus
          error={save.error ?? health.error ?? update.error}
          success={
            save.isSuccess ? 'Key verified and stored.' : health.isSuccess ? 'Provider reachable.' : null
          }
        />
      </div>
    </div>
  );
}

export function ProvidersPage({ settings }: { settings: AppSettings }): JSX.Element {
  const providers = useProviders();
  const overrides = useProviderSettings();
  const rowFor = (providerId: ProviderId) =>
    overrides.data?.find((row) => row.providerId === providerId) ?? null;

  return (
    <Section
      title="Providers"
      description="API keys are encrypted by the OS keyring (DPAPI on Windows, libsecret on Linux) and never stored in the database or exported."
    >
      {providers.isError ? <MutationStatus error={providers.error} /> : null}
      <div className="space-y-3">
        {(providers.data ?? []).map((descriptor) => (
          <ProviderCard
            key={descriptor.id}
            descriptor={descriptor}
            isDefault={descriptor.id === settings.defaultProvider}
            enabled={rowFor(descriptor.id)?.enabled ?? true}
            baseUrl={rowFor(descriptor.id)?.baseUrl ?? null}
          />
        ))}
      </div>
    </Section>
  );
}
