import { useQuery } from '@tanstack/react-query';
import { IPC } from '@ai-anywhere/shared';
import { Button } from '@ai-anywhere/ui';
import { ipcInvoke } from '../../../../lib/ipc-client.js';
import { queryKeys } from '../../../../lib/query-keys.js';
import { Row, Section } from '../fields.js';

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

  return (
    <div className="space-y-8">
      <Section title="AI Anywhere" description="Select text in any app, press the hotkey, pick an action.">
        <Row label="Version">
          <span>{appInfo.data?.version ?? '…'}</span>
        </Row>
        <Row label="Build">
          <span>{appInfo.data ? (appInfo.data.isPackaged ? 'packaged' : 'development') : '…'}</span>
        </Row>
      </Section>

      <Section title="This machine" description="What the app can actually do here, resolved at startup.">
        <Row label="Platform">
          <span>
            {capabilities.data?.platform ?? '…'}
            {capabilities.data?.displayServer === null ? '' : ` · ${capabilities.data?.displayServer}`}
          </span>
        </Row>
        <Row label="Clipboard backend">
          <code>{capabilities.data?.clipboardBackend ?? '…'}</code>
        </Row>
        <Row label="Keystroke backend">
          <code>{capabilities.data?.keystrokeBackend ?? '…'}</code>
        </Row>
        <Row label="Capture / replace">
          <span>
            {capabilities.data
              ? `${capabilities.data.canCaptureSelection ? 'yes' : 'no'} / ${
                  capabilities.data.canReplaceText ? 'yes' : 'no'
                }`
              : '…'}
          </span>
        </Row>
      </Section>

      <Section title="Quit">
        <Button size="sm" variant="outline" onClick={() => void ipcInvoke(IPC.app.quit, undefined)}>
          Quit AI Anywhere
        </Button>
      </Section>
    </div>
  );
}
