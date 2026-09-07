import type { AppSettings, ProviderId } from '@ai-anywhere/shared';
import { FIELD, NumberField, Row, Section } from '../fields.js';
import { useProviderModels, useProviderSettings, useProviders } from '../../api/settings.queries.js';

/**
 * Live models when the provider answers, the static catalog when it does not
 * — an unreachable provider must not leave the user unable to pick a model.
 */
function ModelPicker({
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
    <Row label="Default model">
      <div className="flex items-center gap-2">
        <select className={FIELD} value={value} onChange={(event) => onChange(event.target.value)}>
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
        </select>
        {models.isError ? <span className="shrink-0 text-xs text-muted-foreground">catalog</span> : null}
      </div>
    </Row>
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
    <div className="space-y-8">
      <Section title="Default model" description="Used whenever an action does not name its own.">
        <Row label="Provider">
          <select
            className={FIELD}
            value={settings.defaultProvider}
            onChange={(event) => patch({ defaultProvider: event.target.value as ProviderId })}
          >
            {selectable.map((descriptor) => (
              <option key={descriptor.id} value={descriptor.id}>
                {descriptor.label}
              </option>
            ))}
          </select>
        </Row>
        <ModelPicker
          providerId={settings.defaultProvider}
          value={settings.defaultModel}
          onChange={(defaultModel) => patch({ defaultModel })}
        />
      </Section>

      <Section title="Generation">
        <Row
          label={`Temperature (${settings.temperature.toFixed(2)})`}
          hint="Ignored by models that refuse a sampling temperature (gpt-5, o-series)."
        >
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={settings.temperature}
            onChange={(event) => patch({ temperature: Number(event.target.value) })}
          />
        </Row>
        <NumberField
          label="Max tokens"
          hint="Upper bound on the answer, not the prompt."
          value={settings.maxTokens}
          min={16}
          max={32_000}
          step={16}
          onCommit={(maxTokens) => patch({ maxTokens })}
        />
      </Section>
    </div>
  );
}
