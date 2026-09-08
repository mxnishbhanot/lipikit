import { useQuery } from '@tanstack/react-query';
import { IPC } from '@ai-anywhere/shared';
import { Badge, Button } from '@ai-anywhere/ui';
import { Power } from 'lucide-react';
import { ipcInvoke } from '../../../../lib/ipc-client.js';
import { queryKeys } from '../../../../lib/query-keys.js';
import { Group, Row, SettingsPage } from '../fields.js';

export function AboutPage(): JSX.Element {
  const appInfo = useQuery({
    queryKey: queryKeys.appInfo,
    queryFn: () => ipcInvoke(IPC.app.getInfo, undefined),
    staleTime: Infinity,
  });
  const capabilities = useQuery({
    queryKey: queryKeys.capabilities,
    queryFn: () => ipcInvoke(IPC.context.capabilities, undefined),
    staleTime: Infinity,
  });

  const yesNo = (value: boolean): JSX.Element => (
    <Badge tone={value ? 'success' : 'warning'}>{value ? 'Yes' : 'No'}</Badge>
  );

  return (
    <SettingsPage title="About" description="Select text in any app, press the hotkey, pick an action.">
      <Group title="AI Anywhere">
        <Row label="Version">
          <span className="text-body tabular-nums text-fg-secondary">{appInfo.data?.version ?? '…'}</span>
        </Row>
        <Row label="Build">
          <Badge tone={appInfo.data?.isPackaged ? 'neutral' : 'accent'}>
            {appInfo.data ? (appInfo.data.isPackaged ? 'packaged' : 'development') : '…'}
          </Badge>
        </Row>
      </Group>

      <Group title="This machine" description="What the app can actually do here, resolved at startup.">
        <Row label="Platform">
          <span className="text-body text-fg-secondary">
            {capabilities.data?.platform ?? '…'}
            {capabilities.data?.displayServer === null ? '' : ` · ${capabilities.data?.displayServer}`}
          </span>
        </Row>
        <Row label="Clipboard backend">
          <code className="text-caption text-fg-secondary">{capabilities.data?.clipboardBackend ?? '…'}</code>
        </Row>
        <Row label="Keystroke backend">
          <code className="text-caption text-fg-secondary">{capabilities.data?.keystrokeBackend ?? '…'}</code>
        </Row>
        <Row label="Capture selection" hint="Injects Ctrl+C to read the selection.">
          {capabilities.data ? yesNo(capabilities.data.canCaptureSelection) : <span>…</span>}
        </Row>
        <Row label="Replace text" hint="Injects Ctrl+V to write the answer back.">
          {capabilities.data ? yesNo(capabilities.data.canReplaceText) : <span>…</span>}
        </Row>
      </Group>

      <Group title="Quit">
        <Row label="Quit AI Anywhere" hint="Stops the background process; global shortcuts stop working.">
          <Button size="sm" variant="outline" onClick={() => void ipcInvoke(IPC.app.quit, undefined)}>
            <Power aria-hidden className="h-3.5 w-3.5" />
            Quit
          </Button>
        </Row>
      </Group>
    </SettingsPage>
  );
}
