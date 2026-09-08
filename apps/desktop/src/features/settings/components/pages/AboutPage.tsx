import { useQuery } from '@tanstack/react-query';
import { BRANDING, IPC } from '@ai-anywhere/shared';
import { AppIcon, Badge, Button, cn } from '@ai-anywhere/ui';
import { FileText, Mic, Power, ScanText, Workflow, type LucideIcon } from 'lucide-react';
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
    <SettingsPage title="About" description={BRANDING.tagline}>
      <Group title={BRANDING.appName} description="The name is a placeholder until branding is finalised.">
        <Row label="Application">
          <span className="flex items-center gap-2 text-body text-fg-secondary">
            <AppIcon className="h-5 w-5 text-fg-muted" />
            {BRANDING.appName}
          </span>
        </Row>
        <Row label="Version">
          <span className="text-body tabular-nums text-fg-secondary">
            {appInfo.data?.version ?? BRANDING.version}
          </span>
        </Row>
        <Row label="Build">
          <Badge tone={appInfo.data?.isPackaged ? 'neutral' : 'accent'}>
            {appInfo.data ? (appInfo.data.isPackaged ? 'packaged' : 'development') : '…'}
          </Badge>
        </Row>
        <Row label="Website">
          <a
            href={BRANDING.website}
            target="_blank"
            rel="noreferrer"
            className="text-body text-accent hover:underline"
          >
            {BRANDING.website}
          </a>
        </Row>
        <Row label="Support">
          <a href={`mailto:${BRANDING.supportEmail}`} className="text-body text-accent hover:underline">
            {BRANDING.supportEmail}
          </a>
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

      {/* The context engine has always run; nothing said so. A user who does
          not know the palette re-orders itself per app cannot rely on it. */}
      <Group
        title="Context engine"
        description="Before the popup opens, the app reads the foreground window and puts that application's command first — the chip at the top of the popup names whatever it found."
      >
        <Row
          label="Recognised applications"
          hint="Native windows by process name, web apps by window title, and any other site by the host in the title."
        >
          <span className="max-w-sm text-right text-caption text-fg-secondary">
            Slack, Microsoft Teams, Discord, Jira, Confluence, GitHub, Gmail, Outlook, LinkedIn, VS Code,
            Cursor, Chrome-family and Firefox
          </span>
        </Row>
        <Row
          label="Anything else"
          hint="An unrecognised window still gets the full palette, led by the general writing commands."
        >
          <Badge tone="neutral">Full palette</Badge>
        </Row>
        <Row
          label="Where the text goes"
          hint="Only the selection and the window title reach the provider you configured. The rules themselves run locally and send nothing anywhere."
        >
          <Badge tone="success">Local</Badge>
        </Row>
      </Group>

      <ComingSoon />

      <Group title="Quit">
        <Row
          label={`Quit ${BRANDING.shortName}`}
          hint="Stops the background process; global shortcuts stop working."
        >
          <Button size="sm" variant="outline" onClick={() => void ipcInvoke(IPC.app.quit, undefined)}>
            <Power aria-hidden className="h-3.5 w-3.5" />
            Quit
          </Button>
        </Row>
      </Group>
    </SettingsPage>
  );
}

/** Roadmap teasers, in the order they are being worked on. */
const PLANNED: readonly { title: string; body: string; icon: LucideIcon; next: boolean }[] = [
  {
    icon: ScanText,
    title: 'Screenshot OCR',
    body: 'Grab a region of the screen and run a command on the text inside it — error dialogs, PDFs, anything unselectable.',
    next: true,
  },
  {
    icon: Mic,
    title: 'Voice dictation',
    body: 'Speak the instruction instead of typing it, with the selection already captured.',
    next: true,
  },
  {
    icon: Workflow,
    title: 'Workflow automation',
    body: 'Chain two commands into one shortcut: summarise, then translate the summary.',
    next: true,
  },
  {
    icon: FileText,
    title: 'PDF assistant',
    body: 'Ask questions of a local document without uploading it anywhere.',
    next: false,
  },
];

/**
 * What is coming, kept visibly separate from what is here.
 *
 * Greyed and unclickable on purpose: a roadmap card that looks like a setting
 * is a support ticket. Nothing below is implemented, and the copy says so
 * rather than implying a date.
 */
function ComingSoon(): JSX.Element {
  return (
    <Group
      title="Coming soon"
      description="Being built next, and not in this build. Nothing here is switchable yet — the cards are a roadmap, not settings."
      flush
    >
      {PLANNED.map((item) => (
        <div
          key={item.title}
          aria-disabled
          className={cn(
            'flex items-start gap-3 rounded-card border border-dashed border-border bg-surface/50 p-4',
            'opacity-70',
          )}
        >
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-hover text-fg-muted">
            <item.icon aria-hidden className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-body font-medium text-fg-secondary">
              {item.title}
              <Badge tone="neutral">{item.next ? 'Coming soon' : 'Later'}</Badge>
            </p>
            <p className="mt-1 text-caption leading-relaxed text-fg-muted">{item.body}</p>
          </div>
        </div>
      ))}
    </Group>
  );
}
