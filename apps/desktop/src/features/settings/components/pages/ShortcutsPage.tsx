import { useQuery } from '@tanstack/react-query';
import { IPC, type AppSettings, type CustomPrompt } from '@ai-anywhere/shared';
import { EmptyState } from '@ai-anywhere/ui';
import { AlertTriangle } from 'lucide-react';
import { ipcInvoke } from '../../../../lib/ipc-client.js';
import { queryKeys } from '../../../../lib/query-keys.js';
import { useCustomPrompts, useSavePrompt } from '../../../prompts/api/prompts.queries.js';
import { HotkeyRecorder } from '../HotkeyRecorder.js';
import { Group, MutationStatus, Row, SettingsPage } from '../fields.js';

export function ShortcutsPage({
  settings,
  patch,
  error,
}: {
  settings: AppSettings;
  patch: (value: Partial<AppSettings>) => void;
  error: Error | null;
}): JSX.Element {
  const prompts = useCustomPrompts();
  const savePrompt = useSavePrompt();

  // The whole prompt goes back, because save is an upsert of the row: sending
  // only the shortcut would blank the template.
  const setShortcut = (prompt: CustomPrompt, shortcut: string | null): void => {
    void savePrompt.mutateAsync({
      id: prompt.id,
      label: prompt.label,
      group: prompt.group,
      template: prompt.template,
      appId: prompt.appId,
      shortcut,
    });
  };

  const capabilities = useQuery({
    queryKey: queryKeys.capabilities,
    queryFn: () => ipcInvoke(IPC.context.capabilities, undefined),
    staleTime: Infinity,
  });

  return (
    <SettingsPage
      title="Shortcuts"
      description="Global accelerators are registered with the OS, so they fire from inside any app. A combination another app already owns is refused — the old shortcut stays active and the error appears here."
    >
      <Group title="Global">
        <Row label="Open the popup" hint="Always bound: this is the only way into the popup.">
          <HotkeyRecorder
            value={settings.globalHotkey}
            onChange={(globalHotkey) => patch({ globalHotkey })}
          />
        </Row>
        <Row
          label="Reply to a client"
          hint="Optional. Captures an inbound message and goes straight to the style picker. Client Reply is a built-in palette command either way, so removing this shortcut loses nothing."
        >
          <HotkeyRecorder
            value={settings.clientReplyHotkey}
            onChange={(clientReplyHotkey) => patch({ clientReplyHotkey })}
            onClear={() => patch({ clientReplyHotkey: '' })}
          />
        </Row>
        <MutationStatus error={error} />
      </Group>

      <Group
        title="Prompt templates"
        description="One optional shortcut per template, which runs it on the selected text with no popup in between. Editable here or in Prompt Templates — it is the same setting."
      >
        {prompts.data === undefined ? (
          <Row label="Loading…" />
        ) : prompts.data.length === 0 ? (
          <EmptyState
            kind="first-prompt"
            size="sm"
            description="Create one under Prompt Templates and its shortcut shows up here."
          />
        ) : (
          prompts.data.map((prompt) => (
            <Row key={prompt.id} label={prompt.label} hint={prompt.group}>
              <HotkeyRecorder
                value={prompt.shortcut ?? ''}
                disabled={savePrompt.isPending}
                onChange={(shortcut) => setShortcut(prompt, shortcut)}
                onClear={() => setShortcut(prompt, null)}
              />
            </Row>
          ))
        )}
        <MutationStatus error={savePrompt.error} />
      </Group>

      {capabilities.data && !capabilities.data.canCaptureSelection ? (
        <Group>
          <div className="flex gap-3 px-4 py-3.5">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <div className="text-body font-medium">Capture is degraded</div>
              <p className="mt-0.5 max-w-prose text-caption leading-relaxed text-fg-muted">
                Nothing on this machine can inject Ctrl+C (keystroke backend:{' '}
                <code>{capabilities.data.keystrokeBackend}</code>), so the shortcut works only on text you
                have already copied. On Wayland, install <code>ydotool</code>; on X11, <code>xdotool</code>.
              </p>
            </div>
          </div>
        </Group>
      ) : null}
    </SettingsPage>
  );
}
