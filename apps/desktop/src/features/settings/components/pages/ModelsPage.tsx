import type { AppSettings, ProviderId } from '@ai-anywhere/shared';
import { Badge } from '@ai-anywhere/ui';
import { Group, NumberRow, Row, SelectRow, SettingsPage } from '../fields.js';
import { useProviderModels, useProviderSettings, useProviders } from '../../api/settings.queries.js';

/**
 * Live models when the provider answers, the static catalog when it does not
 * — an unreachable provider must not leave the user unable to pick a model.
 */
function ModelRow({
  providerId,
  value,
  onChange,
}: {
  providerId: ProviderId;
  value: string;
  onChange: (model: string) => void;
}): JSX.Element {
  const models = useProviderModels(providerId);
  const providers = useProviders();
  const fallback = providers.data?.find((entry) => entry.id === providerId)?.models ?? [];
  const options = models.data ?? fallback;

  return (
    <SelectRow
      label="Default model"
      {...(models.isError ? { hint: 'Provider unreachable — showing the built-in catalog.' } : {})}
      value={value}
      onChange={onChange}
    >
      {/* A model saved earlier may not be in the list (renamed, or the
          provider is offline): keep it selectable rather than silently
          switching the user to something else. */}
      {options.some((model) => model.id === value) ? null : <option value={value}>{value}</option>}
      {options.map((model) => (
        <option key={model.id} value={model.id}>
          {model.label}
          {model.contextWindow > 0 ? ` · ${Math.round(model.contextWindow / 1_000)}k` : ''}
        </option>
      ))}
    </SelectRow>
  );
}

export function ModelsPage({
  settings,
  patch,
}: {
  settings: AppSettings;
  patch: (value: Partial<AppSettings>) => void;
}): JSX.Element {
  const providers = useProviders();
  const overrides = useProviderSettings();
  // A provider the user switched off must not stay selectable here, but the
  // current default always is — otherwise the picker could show nothing.
  const selectable = (providers.data ?? []).filter((descriptor) => {
    const row = overrides.data?.find((entry) => entry.providerId === descriptor.id);
    return (row?.enabled ?? true) || descriptor.id === settings.defaultProvider;
  });

  return (
    <SettingsPage title="Models" description="What runs when an action does not name a model of its own.">
      <Group title="Default">
        <SelectRow
          label="Provider"
          hint="Only enabled providers are listed."
          value={settings.defaultProvider}
          options={selectable.map((descriptor) => [descriptor.id, descriptor.label])}
          onChange={(defaultProvider) => patch({ defaultProvider: defaultProvider as ProviderId })}
        />
        <ModelRow
          providerId={settings.defaultProvider}
          value={settings.defaultModel}
          onChange={(defaultModel) => patch({ defaultModel })}
        />
      </Group>

      <Group title="Generation">
        <Row
          label="Temperature"
          hint="Ignored by models that refuse a sampling temperature (gpt-5, o-series)."
        >
          <input
            type="range"
            aria-label="Temperature"
            className="w-40 accent-accent"
            min={0}
            max={2}
            step={0.05}
            value={settings.temperature}
            onChange={(event) => patch({ temperature: Number(event.target.value) })}
          />
          <Badge tone="neutral" className="tabular-nums">
            {settings.temperature.toFixed(2)}
          </Badge>
        </Row>
        <NumberRow
          label="Max tokens"
          hint="Upper bound on the answer, not the prompt."
          value={settings.maxTokens}
          min={16}
          max={32_000}
          step={16}
          onCommit={(maxTokens) => patch({ maxTokens })}
        />
      </Group>
    </SettingsPage>
  );
}
