import { useQuery } from '@tanstack/react-query';
import { IPC, type AppSettings } from '@ai-anywhere/shared';
import { ipcInvoke } from '../../../../lib/ipc-client.js';
import { queryKeys } from '../../../../lib/query-keys.js';
import { HotkeyRecorder } from '../HotkeyRecorder.js';
import { MutationStatus, Row, Section } from '../fields.js';

export function ShortcutsPage({
  settings,
  patch,
  error,
}: {
  settings: AppSettings;
  patch: (value: Partial<AppSettings>) => void;
  error: Error | null;
}): JSX.Element {
  const capabilities = useQuery({
    queryKey: queryKeys.capabilities,
    queryFn: () => ipcInvoke(IPC.context.capabilities, undefined),
    staleTime: Infinity,
  });

  return (
    <div className="space-y-8">
      <Section
        title="Global shortcuts"
        description="Registered with the OS, so they fire from inside any app. A combination another app already owns is refused — the old shortcut stays active and the error appears here."
      >
        <Row label="Open the popup">
          <HotkeyRecorder
            value={settings.globalHotkey}
            onChange={(globalHotkey) => patch({ globalHotkey })}
          />
        </Row>
        <Row
          label="Reply to a client"
          hint="Captures an inbound message and goes straight to the style picker."
        >
          <HotkeyRecorder
            value={settings.clientReplyHotkey}
            onChange={(clientReplyHotkey) => patch({ clientReplyHotkey })}
          />
        </Row>
        <MutationStatus error={error} />
      </Section>

      {capabilities.data && !capabilities.data.canCaptureSelection ? (
        <Section title="Capture is degraded">
          <p className="text-xs text-muted-foreground">
            Nothing on this machine can inject Ctrl+C (keystroke backend:{' '}
            <code>{capabilities.data.keystrokeBackend}</code>), so the shortcut works only on text you have
            already copied. On Wayland, install <code>ydotool</code>; on X11, <code>xdotool</code>.
          </p>
        </Section>
      ) : null}
    </div>
  );
}
