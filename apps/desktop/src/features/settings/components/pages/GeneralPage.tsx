import { BRANDING, type AppSettings, type Tone } from '@lipikit/shared';
import { Button } from '@lipikit/ui';
import { Group, MutationStatus, NumberRow, Row, SelectRow, SettingsPage, ToggleRow } from '../fields.js';
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
    <SettingsPage
      title="General"
      description={`How ${BRANDING.shortName} behaves by default, and where it starts.`}
    >
      <Group title="Behaviour">
        <SelectRow
          label="Default tone"
          hint="Used by any action that does not pick its own."
          value={settings.defaultTone}
          options={TONES.map((tone) => [tone, tone])}
          onChange={(tone) => patch({ defaultTone: tone as Tone })}
        />
        <ToggleRow
          label="Stream responses"
          hint="Off means one non-streaming call: slower to the first word, same result."
          checked={settings.streamingEnabled}
          onChange={(streamingEnabled) => patch({ streamingEnabled })}
        />
        <NumberRow
          label="Request timeout"
          hint="Whole-request deadline, applied per provider call."
          value={Math.round(settings.requestTimeoutMs / 1_000)}
          min={1}
          max={600}
          suffix="seconds"
          onCommit={(seconds) => patch({ requestTimeoutMs: seconds * 1_000 })}
        />
      </Group>

      <Group title="Window">
        <ToggleRow
          label="Keep running in the tray"
          hint={`Closing or minimizing the window leaves ${BRANDING.shortName} in the tray so the hotkey keeps working. Off means closing the window quits the app.`}
          checked={settings.minimizeToTray}
          onChange={(minimizeToTray) => patch({ minimizeToTray })}
        />
      </Group>

      <Group title="Startup">
        <ToggleRow
          label="Launch at login"
          hint={`Starts ${BRANDING.shortName} in the background so the hotkey works after a reboot. Installed builds only.`}
          checked={settings.launchAtLogin}
          onChange={(launchAtLogin) => patch({ launchAtLogin })}
        />
        <MutationStatus error={error} />
      </Group>

      <Group
        title="Backup"
        description="Settings, shortcuts, prompts and provider endpoints as one JSON file. API keys are never exported — they stay encrypted in the OS keyring."
      >
        <Row
          label="Settings file"
          hint="Import replaces the values in the file; anything it omits is left alone."
        >
          <Button
            size="sm"
            variant="outline"
            disabled={exportSettings.isPending}
            onClick={() => exportSettings.mutate()}
          >
            {exportSettings.isPending ? 'Exporting…' : 'Export'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={importSettings.isPending}
            onClick={() => importSettings.mutate()}
          >
            {importSettings.isPending ? 'Importing…' : 'Import'}
          </Button>
        </Row>
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
      </Group>
    </SettingsPage>
  );
}
