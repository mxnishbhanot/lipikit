import type { AppSettings, Tone } from '@ai-anywhere/shared';
import { Button } from '@ai-anywhere/ui';
import { MutationStatus, NumberField, Row, Section, Toggle, FIELD } from '../fields.js';
import { useExportSettings, useImportSettings } from '../../api/settings.queries.js';

const TONES: readonly Tone[] = ['neutral', 'formal', 'casual', 'friendly', 'confident', 'concise'];

export function GeneralPage({
  settings,
  patch,
  error,
}: {
  settings: AppSettings;
  patch: (value: Partial<AppSettings>) => void;
  error: Error | null;
}): JSX.Element {
  const exportSettings = useExportSettings();
  const importSettings = useImportSettings();

  return (
    <div className="space-y-8">
      <Section title="Behaviour">
        <Row label="Default tone">
          <select
            className={FIELD}
            value={settings.defaultTone}
            onChange={(event) => patch({ defaultTone: event.target.value as Tone })}
          >
            {TONES.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </Row>

        <Toggle
          label="Stream responses"
          hint="Off means one non-streaming call: slower to the first word, same result."
          checked={settings.streamingEnabled}
          onChange={(streamingEnabled) => patch({ streamingEnabled })}
        />

        <NumberField
          label="Request timeout (s)"
          hint="Whole-request deadline, applied per provider call."
          value={Math.round(settings.requestTimeoutMs / 1_000)}
          min={1}
          max={600}
          onCommit={(seconds) => patch({ requestTimeoutMs: seconds * 1_000 })}
        />

        <Toggle
          label="Launch at login"
          hint="Starts AI Anywhere in the background so the hotkey works after a reboot. Installed builds only."
          checked={settings.launchAtLogin}
          onChange={(launchAtLogin) => patch({ launchAtLogin })}
        />
        <MutationStatus error={error} />
      </Section>

      <Section
        title="Backup"
        description="Settings, shortcuts, prompts and provider endpoints as one JSON file. API keys are never exported — they stay encrypted in the OS keyring."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={exportSettings.isPending}
            onClick={() => exportSettings.mutate()}
          >
            {exportSettings.isPending ? 'Exporting…' : 'Export settings'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={importSettings.isPending}
            onClick={() => importSettings.mutate()}
          >
            {importSettings.isPending ? 'Importing…' : 'Import settings'}
          </Button>
        </div>
        <MutationStatus
          error={exportSettings.error ?? importSettings.error}
          success={
            exportSettings.data
              ? `Exported to ${exportSettings.data}`
              : importSettings.data
                ? 'Settings imported.'
                : null
          }
        />
      </Section>
    </div>
  );
}
