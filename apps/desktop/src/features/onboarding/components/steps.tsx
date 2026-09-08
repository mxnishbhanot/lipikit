import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Input, Kbd, cn } from '@ai-anywhere/ui';
import type { Platform, ProviderDescriptor, ProviderId } from '@ai-anywhere/shared';
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  ExternalLink,
  Keyboard,
  Loader2,
  MonitorSmartphone,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  useHasApiKey,
  useProviderModels,
  useProviders,
  useSaveApiKey,
} from '../../settings/api/settings.queries.js';
import { useCapabilities } from '../../overlay/api/overlay.queries.js';
import { useGenerate } from '../../overlay/api/ai.queries.js';
import { HotkeyRecorder } from '../../settings/components/HotkeyRecorder.js';
import { queryKeys } from '../../../lib/query-keys.js';

/** The four providers the wizard offers. The rest stay in settings: a first run should be a choice between a few good defaults, not the whole catalog. */
const OFFERED: readonly ProviderId[] = ['openai', 'anthropic', 'google', 'openrouter'];

/** Models the wizard puts a Recommended badge on, per provider. */
const RECOMMENDED: Partial<Record<ProviderId, string>> = {
  openai: 'gpt-5-mini',
  anthropic: 'claude-sonnet-5',
  google: 'gemini-2.5-flash',
  openrouter: 'openai/gpt-5-mini',
};

/** The message the demo rewrites. Fixed text, so the step works before the user has selected anything anywhere. */
const SAMPLE = `hey so the thing we talked about yday is still broken, i tried the fix u sent but nothing happend. can u look at it today? its blocking my whole team and ppl are asking me about it constantly`;

/** Every step is a centred column: icon, title, subtitle, then its own body. */
export function StepShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: ReactNode;
  title: string;
  subtitle: string;
  children?: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center">
      {icon === undefined ? null : (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-card bg-accent-subtle text-accent">
          {icon}
        </div>
      )}
      <h2 className="text-display font-semibold tracking-tight text-fg-primary">{title}</h2>
      <p className="mt-2 max-w-md text-body text-fg-muted">{subtitle}</p>
      {children === undefined ? null : <div className="mt-8 w-full text-left">{children}</div>}
    </div>
  );
}

/**
 * A selectable tile. Radio semantics rather than a styled button: arrow keys
 * then move within the group, which is what a keyboard-first app owes a
 * choice of four.
 */
function ChoiceCard({
  selected,
  title,
  hint,
  badge,
  icon,
  onSelect,
}: {
  selected: boolean;
  title: string;
  hint?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-card border p-4 text-left',
        'transition-colors duration-fast ease-calm',
        selected
          ? 'border-accent bg-accent-subtle shadow-sm'
          : 'border-border bg-surface hover:bg-surface-hover',
      )}
    >
      {icon === undefined ? null : (
        <span className={cn('mt-0.5 shrink-0', selected ? 'text-accent' : 'text-fg-muted')}>{icon}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-body font-medium text-fg-primary">{title}</span>
          {badge}
        </span>
        {hint === undefined ? null : <span className="mt-0.5 block text-caption text-fg-muted">{hint}</span>}
      </span>
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-accent bg-accent text-accent-foreground' : 'border-border',
        )}
      >
        {selected ? <Check aria-hidden className="h-3 w-3" /> : null}
      </span>
    </button>
  );
}

export function WelcomeStep(): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center">
      {/* The one gradient surface in the app, per the design system: hero and
          onboarding only. */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-card bg-gradient-to-br from-accent to-accent/60 shadow-lg">
        <Sparkles aria-hidden className="h-10 w-10 text-accent-foreground" />
      </div>
      <h1 className="text-hero font-semibold tracking-tight text-fg-primary">AI Anywhere</h1>
      <p className="mt-3 max-w-md text-body-lg text-fg-muted">
        Select text in any app, press one shortcut, and let AI rewrite, reply or summarise it in place.
      </p>
      <p className="mt-6 flex items-center gap-1.5 text-caption text-fg-muted">
        Takes about a minute. Your keys stay in the OS keyring.
      </p>
    </div>
  );
}

const PLATFORMS: readonly { id: Platform; title: string; hint: string }[] = [
  { id: 'win32', title: 'Windows', hint: 'Keys encrypted with DPAPI; capture via PowerShell or nut.js.' },
  { id: 'linux', title: 'Ubuntu', hint: 'Keys encrypted with libsecret; capture via xdotool or ydotool.' },
];

export function PlatformStep({
  detected,
  value,
  onChange,
}: {
  detected: Platform | null;
  value: Platform | null;
  onChange: (platform: Platform) => void;
}): JSX.Element {
  return (
    <StepShell
      icon={<MonitorSmartphone aria-hidden className="h-7 w-7" />}
      title="Confirm your platform"
      subtitle="Detected from this machine. It decides which capture backends and shortcut hints the app shows you."
    >
      <div role="radiogroup" aria-label="Platform" className="grid gap-3 sm:grid-cols-2">
        {PLATFORMS.map((platform) => (
          <ChoiceCard
            key={platform.id}
            selected={value === platform.id}
            title={platform.title}
            hint={platform.hint}
            {...(detected === platform.id ? { badge: <Badge tone="accent">Detected</Badge> } : {})}
            onSelect={() => onChange(platform.id)}
          />
        ))}
      </div>
    </StepShell>
  );
}

export function ProviderStep({
  value,
  onChange,
}: {
  value: ProviderId | null;
  onChange: (providerId: ProviderId) => void;
}): JSX.Element {
  const providers = useProviders();
  const offered = (providers.data ?? []).filter((descriptor) => OFFERED.includes(descriptor.id));

  return (
    <StepShell
      icon={<Sparkles aria-hidden className="h-7 w-7" />}
      title="Choose a provider"
      subtitle="Whoever answers the prompts. You can add the others, and switch between them, from settings later."
    >
      <div role="radiogroup" aria-label="Provider" className="grid gap-3 sm:grid-cols-2">
        {offered.map((descriptor) => (
          <ChoiceCard
            key={descriptor.id}
            selected={value === descriptor.id}
            title={descriptor.label}
            hint={descriptor.models[0]?.label ?? descriptor.baseUrl}
            onSelect={() => onChange(descriptor.id)}
          />
        ))}
      </div>
    </StepShell>
  );
}

export function ApiKeyStep({
  descriptor,
  onValidated,
}: {
  descriptor: ProviderDescriptor;
  /** Fired once a key is verified and stored, which unblocks Continue. */
  onValidated: () => void;
}): JSX.Element {
  const [apiKey, setApiKey] = useState('');
  const hasKey = useHasApiKey(descriptor.id);
  const save = useSaveApiKey();
  // A key stored on a previous run (or a provider that needs none) is already
  // done: the step should say so rather than ask for it again.
  const stored = !descriptor.requiresApiKey || hasKey.data === true;

  // A key left in the keyring by an earlier run counts as done: without this
  // the step says "verified and stored" while Continue stays greyed out.
  useEffect(() => {
    if (stored) onValidated();
  }, [stored, onValidated]);

  return (
    <StepShell
      icon={<Check aria-hidden className="h-7 w-7" />}
      title={`Connect ${descriptor.label}`}
      subtitle={
        descriptor.requiresApiKey
          ? 'The key is checked against the provider before it is stored, so a typo fails here instead of on your first hotkey press.'
          : 'This provider runs locally and needs no key.'
      }
    >
      {stored ? (
        <div className="flex items-center gap-2 rounded-card border border-border bg-surface p-4">
          <Check aria-hidden className="h-4 w-4 text-success" />
          <p className="text-body text-fg-primary">
            {descriptor.requiresApiKey ? 'Key verified and stored in the OS keyring.' : 'Nothing to connect.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              autoFocus
              type="password"
              autoComplete="off"
              value={apiKey}
              aria-label={`${descriptor.label} API key`}
              placeholder="paste your API key…"
              onChange={(event) => setApiKey(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || apiKey.trim().length === 0 || save.isPending) return;
                save.mutate({ providerId: descriptor.id, apiKey }, { onSuccess: onValidated });
              }}
            />
            <Button
              disabled={apiKey.trim().length === 0 || save.isPending}
              onClick={() => save.mutate({ providerId: descriptor.id, apiKey }, { onSuccess: onValidated })}
            >
              {save.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              {save.isPending ? 'Validating…' : 'Validate'}
            </Button>
          </div>
          {save.error ? <p className="text-caption text-danger">{save.error.message}</p> : null}
          {descriptor.apiKeyUrl === null ? null : (
            <a
              className="inline-flex items-center gap-1 text-caption text-accent underline-offset-2 hover:underline"
              href={descriptor.apiKeyUrl}
              target="_blank"
              rel="noreferrer"
            >
              Get a {descriptor.label} key <ExternalLink aria-hidden className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </StepShell>
  );
}

export function ModelStep({
  descriptor,
  value,
  onChange,
}: {
  descriptor: ProviderDescriptor;
  value: string | null;
  onChange: (model: string) => void;
}): JSX.Element {
  // Live list when the vendor answers, catalog when it does not: the step must
  // still offer something on a flaky network.
  const models = useProviderModels(descriptor.id);
  const options = models.data ?? descriptor.models;
  const recommended = RECOMMENDED[descriptor.id];

  return (
    <StepShell
      icon={<Wand2 aria-hidden className="h-7 w-7" />}
      title="Pick a default model"
      subtitle="Every command uses this unless you change it. A small, fast model is the right default — the popup is used mid-sentence."
    >
      <div role="radiogroup" aria-label="Default model" className="space-y-3">
        {options.map((model) => (
          <ChoiceCard
            key={model.id}
            selected={value === model.id}
            title={model.label}
            hint={`${(model.contextWindow / 1000).toLocaleString()}k context · ${model.id}`}
            {...(model.id === recommended ? { badge: <Badge tone="accent">Recommended</Badge> } : {})}
            onSelect={() => onChange(model.id)}
          />
        ))}
      </div>
    </StepShell>
  );
}

/** One capability line: what it is, whether this machine has it, why it matters. */
function CapabilityRow({
  label,
  hint,
  ok,
  pending,
}: {
  label: string;
  hint: string;
  ok: boolean;
  pending: boolean;
}): JSX.Element {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="mt-0.5 shrink-0">
        {pending ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin text-fg-muted" />
        ) : ok ? (
          <Check aria-hidden className="h-4 w-4 text-success" />
        ) : (
          <AlertTriangle aria-hidden className="h-4 w-4 text-warning" />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-body font-medium text-fg-primary">{label}</p>
        <p className="mt-0.5 text-caption leading-relaxed text-fg-muted">{hint}</p>
      </div>
    </div>
  );
}

export function PermissionsStep({
  hotkey,
  onHotkeyChange,
}: {
  hotkey: string;
  onHotkeyChange: (accelerator: string) => void;
}): JSX.Element {
  const capabilities = useCapabilities();
  const queryClient = useQueryClient();
  const caps = capabilities.data ?? null;

  return (
    <StepShell
      icon={<Keyboard aria-hidden className="h-7 w-7" />}
      title="Shortcut and clipboard"
      subtitle="The shortcut is registered with the desktop, so it works from any app. Capture and replace use the clipboard, which needs a backend the OS allows."
    >
      <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-body font-medium text-fg-primary">Global shortcut</p>
            <p className="mt-0.5 text-caption text-fg-muted">
              Currently <Kbd combo={hotkey.length > 0 ? hotkey : 'unset'} />. Saved as soon as you record it.
            </p>
          </div>
          {/* No onClear: this is the only way into the popup, so it cannot be
              removed — only replaced. */}
          <HotkeyRecorder value={hotkey} onChange={onHotkeyChange} />
        </div>
        <CapabilityRow
          label="Read the selection"
          hint={
            caps === null
              ? 'Checking what this machine allows…'
              : caps.canCaptureSelection
                ? `Ctrl+C can be injected via ${caps.keystrokeBackend}, so the hotkey grabs whatever is selected.`
                : 'No backend can inject Ctrl+C here. The popup still works — copy the text yourself first.'
          }
          ok={caps?.canCaptureSelection ?? false}
          pending={capabilities.isPending}
        />
        <CapabilityRow
          label="Write the answer back"
          hint={
            caps === null
              ? 'Checking what this machine allows…'
              : caps.canReplaceText
                ? `Ctrl+V can be injected via ${caps.keystrokeBackend}: answers replace the selection in place.`
                : 'No backend can inject Ctrl+V here. Answers are copied to the clipboard instead.'
          }
          ok={caps?.canReplaceText ?? false}
          pending={capabilities.isPending}
        />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-caption text-fg-muted">
            {caps === null
              ? ''
              : `${caps.clipboardBackend} clipboard${caps.displayServer === null ? '' : ` · ${caps.displayServer}`}`}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={capabilities.isFetching}
            onClick={() => void queryClient.invalidateQueries({ queryKey: queryKeys.capabilities })}
          >
            <ClipboardCheck aria-hidden className="h-3.5 w-3.5" />
            Re-check
          </Button>
        </div>
      </div>
    </StepShell>
  );
}

export function DemoStep({ model }: { model: string | null }): JSX.Element {
  const generate = useGenerate();
  const hasRun = generate.output.length > 0 || generate.isPending;

  return (
    <StepShell
      icon={<Wand2 aria-hidden className="h-7 w-7" />}
      title="Try it on a real message"
      subtitle="This is what happens after you select text and press the shortcut. Here the selection is already made for you."
    >
      <div className="space-y-3">
        {/* Mock Slack row: the context engine recognises Slack, so this is the
            app the palette's suggestions are tuned for. */}
        <div className="rounded-card border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-control bg-accent-subtle text-caption font-semibold text-accent">
              PM
            </div>
            <span className="text-caption font-medium text-fg-primary">Priya · Slack</span>
            <Badge tone="neutral">selected</Badge>
          </div>
          <p className="mt-2 rounded-control bg-accent-subtle/60 p-2 text-body text-fg-primary">{SAMPLE}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            disabled={generate.isPending}
            onClick={() => {
              void generate.run({ action: 'rewrite', text: SAMPLE, appName: 'slack' }).catch(() => {
                // The hook keeps the error; a rejected promise here would be an
                // unhandled rejection for something already on screen.
              });
            }}
          >
            {generate.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            {generate.isPending ? 'Rewriting…' : hasRun ? 'Rewrite again' : 'Rewrite with AI'}
          </Button>
          {generate.isPending ? (
            <Button variant="ghost" onClick={generate.cancel}>
              Cancel
            </Button>
          ) : (
            <span className="text-caption text-fg-muted">{model === null ? '' : `using ${model}`}</span>
          )}
        </div>

        {generate.error ? (
          <p className="text-caption text-danger">
            {generate.error.message} — you can finish setup and fix the provider in settings.
          </p>
        ) : null}

        {hasRun ? (
          <div className="rounded-card border border-accent/40 bg-accent-subtle/40 p-4">
            <p className="mb-1 text-caption font-medium text-accent">Rewritten</p>
            <p className="whitespace-pre-wrap text-body-lg leading-relaxed text-fg-primary">
              {generate.output}
              {generate.isPending ? <span className="animate-pulse">▍</span> : null}
            </p>
          </div>
        ) : null}
      </div>
    </StepShell>
  );
}
