import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  FileCode,
  Github,
  History,
  KeyRound,
  Keyboard,
  Layers,
  Monitor,
  Replace,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import { BRANDING } from '@ai-anywhere/shared';
import { AppIcon, Badge, Button, Card, cn, Kbd, liftable } from '@ai-anywhere/ui';
import {
  DOWNLOADS,
  DOWNLOAD_NOTE,
  FAQS,
  FEATURES,
  HOTKEY,
  PLATFORMS,
  PLATFORM_NOTE,
  PRIVACY_POINTS,
  PROVIDERS,
  PROVIDER_NOTE,
  RELEASES_URL,
  REPO_URL,
  SHORTCUT_GROUPS,
  STEPS,
} from './content.js';
import { Reveal, Section, WindowFrame } from './components.js';

/** Feature icons by name, so content.ts stays free of component imports. */
const FEATURE_ICONS: Record<string, LucideIcon> = {
  Keyboard,
  Replace,
  Layers,
  History,
  FileCode,
  KeyRound,
};

/**
 * Windows and Linux marks. lucide has no vendor logos, and pulling a brand-icon
 * package for two glyphs is a dependency for two paths — `Monitor` and
 * `Terminal` say platform without pretending to be a trademark.
 */
const PLATFORM_ICONS: Record<string, LucideIcon> = { Windows: Monitor, Linux: Terminal };

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

/** The mock palette in the hero: what the popup shows after the hotkey. */
const MOCK_COMMANDS: readonly { readonly label: string; readonly group: string }[] = [
  { label: 'Fix Grammar', group: 'Writing' },
  { label: 'Professional', group: 'Tone' },
  { label: 'Commit Message', group: 'Developer' },
  { label: 'Client Reply', group: 'Communication' },
];

function HeroPopup(): JSX.Element {
  return (
    <WindowFrame className="w-full max-w-xl rounded-popup shadow-popup">
      {/* Header: search field, active model, settings — the popup's real layout. */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-body text-fg-muted">Search commands…</span>
        <span className="ml-auto shrink-0">
          <Badge tone="accent">GPT-5 mini</Badge>
        </span>
      </div>

      <ul className="p-2">
        {MOCK_COMMANDS.map((command, index) => (
          <li
            key={command.label}
            className={cn(
              'flex items-center gap-3 rounded-control px-3 py-2.5 text-body',
              index === 0 ? 'bg-accent-subtle text-accent' : 'text-fg-secondary',
            )}
          >
            <span className="font-medium">{command.label}</span>
            <span className="text-caption text-fg-muted">{command.group}</span>
            {index === 0 && (
              <span className="ml-auto">
                <Kbd>Enter</Kbd>
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-caption text-fg-muted">
        <Kbd combo="Ctrl+Enter" />
        <span>replace selection</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          {/* A live caret, because the popup streams an answer. Stepped, not
              faded, so it reads as a cursor and not as a loading state.
              `MotionConfig reducedMotion="user"` in main.tsx stops it for
              anyone who asked for no motion. */}
          <motion.span
            className="inline-block h-3 w-[2px] bg-accent"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, times: [0, 0.49, 0.5, 1], repeat: Infinity, ease: 'linear' }}
          />
          <span>420 ms</span>
        </span>
      </div>
    </WindowFrame>
  );
}

export function Hero(): JSX.Element {
  return (
    <header className="relative overflow-hidden">
      {/* One accent wash behind the fold. Pointer-events off: it is paint, not
          a surface, and must never eat a click on the buttons above it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[36rem] bg-[radial-gradient(60%_60%_at_50%_40%,hsl(var(--accent)/0.18),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-content px-6 pb-20 pt-16 text-center sm:pb-28 sm:pt-24">
        <Reveal>
          <a
            href={RELEASES_URL}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-1.5',
              'text-caption text-fg-secondary transition-colors duration-fast ease-calm hover:bg-surface-hover',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {BRANDING.version} is out for Windows and Linux
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 className="mx-auto mt-8 max-w-4xl text-hero-lg font-semibold text-fg-primary">
            AI where you already
            <br />
            <span className="text-accent">type</span>
          </h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-body-lg text-fg-secondary sm:text-lg">
            Select text in any application, press <Kbd combo={HOTKEY} />, and get a rewrite that replaces it
            in place. No tab to switch to, no window to find, no copy and paste.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <a href="#download">
              <Download className="h-4 w-4" />
              Download for free
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <Github className="h-4 w-4" />
              Source on GitHub
            </a>
          </Button>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-5 text-caption text-fg-muted">{DOWNLOAD_NOTE}</p>
        </Reveal>

        <Reveal delay={0.25} className="mt-16 flex justify-center">
          <HeroPopup />
        </Reveal>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Features                                                                    */
/* -------------------------------------------------------------------------- */

export function Features(): JSX.Element {
  return (
    <Section
      id="features"
      eyebrow="Features"
      title="Built for the writing you already do"
      lead="A palette of actions on the text under your cursor, wired to the provider you already pay for, storing everything on your own disk."
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => {
          const Icon = FEATURE_ICONS[feature.icon] ?? Layers;
          return (
            <Reveal as="li" key={feature.title} delay={index * 0.04}>
              <motion.div {...liftable} className="h-full">
                <Card className="h-full p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-control bg-accent-subtle text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-title font-semibold text-fg-primary">{feature.title}</h3>
                  <p className="mt-2 text-body text-fg-secondary">{feature.body}</p>
                </Card>
              </motion.div>
            </Reveal>
          );
        })}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Works everywhere                                                            */
/* -------------------------------------------------------------------------- */

export function WorksEverywhere(): JSX.Element {
  return (
    <Section
      id="everywhere"
      eyebrow="Works everywhere"
      title="Any window, any field, both platforms"
      lead="Capture and replacement go through the same clipboard and keystroke paths the OS gives every application, so there is nothing to integrate and no plugin per editor."
    >
      <ol className="grid gap-5 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <Reveal as="li" key={step.n} delay={index * 0.05}>
            <Card className="h-full p-6">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-accent/30 bg-accent-subtle text-caption font-semibold text-accent">
                {step.n}
              </span>
              <h3 className="mt-4 text-title font-semibold text-fg-primary">{step.title}</h3>
              <p className="mt-2 text-body text-fg-secondary">{step.body}</p>
            </Card>
          </Reveal>
        ))}
      </ol>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {PLATFORMS.map((platform, index) => {
          const Icon = PLATFORM_ICONS[platform.icon] ?? Monitor;
          return (
            <Reveal key={platform.name} delay={index * 0.05}>
              <Card className="h-full p-6">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-fg-secondary" />
                  <h3 className="text-title font-semibold text-fg-primary">{platform.name}</h3>
                </div>
                <p className="mt-3 text-body text-fg-secondary">{platform.detail}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {platform.artifacts.map((artifact) => (
                    <Badge key={artifact}>{artifact}</Badge>
                  ))}
                </div>
              </Card>
            </Reveal>
          );
        })}
      </div>

      <Reveal>
        <p className="mt-6 text-caption text-fg-muted">{PLATFORM_NOTE}</p>
      </Reveal>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Providers                                                                   */
/* -------------------------------------------------------------------------- */

export function Providers(): JSX.Element {
  return (
    <Section id="providers" eyebrow="Providers" title="Seven providers, one dropdown" lead={PROVIDER_NOTE}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((provider, index) => (
          <Reveal as="li" key={provider.label} delay={index * 0.03}>
            <Card className="flex h-full flex-col gap-1.5 p-5">
              <div className="flex items-center gap-2">
                <h3 className="text-body-lg font-semibold text-fg-primary">{provider.label}</h3>
                {provider.local === true && <Badge tone="success">No key needed</Badge>}
              </div>
              <p className="text-body text-fg-secondary">{provider.models}</p>
            </Card>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Screenshots                                                                 */
/* -------------------------------------------------------------------------- */

/** A settings row, drawn. Same tokens as the app's own rows. */
function MockRow({
  label,
  value,
  active = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly active?: boolean;
}): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-control px-3 py-2.5 text-body',
        active ? 'bg-accent-subtle text-accent' : 'text-fg-secondary',
      )}
    >
      <span className="font-medium">{label}</span>
      <span className={cn('text-caption', active ? 'text-accent' : 'text-fg-muted')}>{value}</span>
    </div>
  );
}

export function Screenshots(): JSX.Element {
  return (
    <Section
      id="screenshots"
      eyebrow="Screenshots"
      title="Two windows and nothing else"
      lead="A popup that opens at the cursor and closes when you are done, and a settings window you open once a month. Both follow your system theme."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <WindowFrame title={`${BRANDING.shortName} — Providers`}>
            {/* The page-nav column is dropped on a phone: two columns in
                350px turns every label into two lines. */}
            <div className="grid divide-border sm:grid-cols-[9rem_1fr] sm:divide-x">
              <nav className="hidden space-y-1 p-3 text-body sm:block">
                {['General', 'Providers', 'Models', 'Shortcuts', 'Prompts', 'History'].map((page) => (
                  <div
                    key={page}
                    className={cn(
                      'rounded-control px-3 py-1.5',
                      page === 'Providers'
                        ? 'bg-surface-hover font-medium text-fg-primary'
                        : 'text-fg-secondary',
                    )}
                  >
                    {page}
                  </div>
                ))}
              </nav>
              <div className="space-y-1 p-3">
                <MockRow label="OpenAI" value="Key validated" active />
                <MockRow label="Anthropic" value="Add a key" />
                <MockRow label="Google Gemini" value="Add a key" />
                <MockRow label="Ollama" value="127.0.0.1:11434" />
              </div>
            </div>
          </WindowFrame>
        </Reveal>

        <Reveal delay={0.06} className="space-y-6">
          <WindowFrame className="rounded-popup">
            <div className="border-b border-border px-4 py-3 text-body text-fg-muted">
              Rewrite this paragraph…
            </div>
            <div className="space-y-2 p-4 text-body text-fg-secondary">
              <p className="text-fg-primary">
                Thanks for the update — I&rsquo;ll review the changes this afternoon and come back with
                anything that needs a second look.
              </p>
              <div className="flex gap-2 pt-2">
                <Button size="sm">
                  <Check className="h-3.5 w-3.5" />
                  Replace
                </Button>
                <Button size="sm" variant="outline">
                  Copy
                </Button>
              </div>
            </div>
          </WindowFrame>

          <WindowFrame title={`${BRANDING.shortName} — Prompt templates`}>
            <div className="space-y-1 p-3">
              <MockRow label="Bug report" value="Ctrl+Alt+B" active />
              <MockRow label="Standup update" value="Ctrl+Alt+S" />
              <MockRow label="Release notes" value="Unbound" />
            </div>
          </WindowFrame>
        </Reveal>
      </div>

      <Reveal>
        <p className="mt-6 text-caption text-fg-muted">
          Rendered from the app&rsquo;s own design tokens rather than captured, so light and dark are always
          in step with the shipped build.
        </p>
      </Reveal>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Shortcuts                                                                   */
/* -------------------------------------------------------------------------- */

export function Shortcuts(): JSX.Element {
  return (
    <Section
      id="shortcuts"
      eyebrow="Keyboard shortcuts"
      title="Hands stay on the keyboard"
      lead="Nothing in the popup needs the mouse. Press F1 in the app for the full sheet; these are the ones worth learning first."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {SHORTCUT_GROUPS.map((group, index) => (
          <Reveal key={group.title} delay={index * 0.04}>
            <Card className="h-full p-6">
              <h3 className="text-title font-semibold text-fg-primary">{group.title}</h3>
              <dl className="mt-4 space-y-3">
                {group.rows.map((row) => (
                  <div key={row.keys} className="flex items-baseline justify-between gap-4">
                    <dt className="shrink-0">
                      <Kbd combo={row.keys} />
                    </dt>
                    <dd className="text-right text-body text-fg-secondary">{row.what}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Privacy                                                                     */
/* -------------------------------------------------------------------------- */

export function Privacy(): JSX.Element {
  return (
    <Section
      id="privacy"
      eyebrow="Privacy"
      title="No account, no telemetry, no server of ours"
      lead="The app talks to the AI provider you configured. That is the only network call it makes."
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PRIVACY_POINTS.map((point, index) => (
          <Reveal as="li" key={point.title} delay={index * 0.04}>
            <Card className="h-full p-6">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-success/[0.12] text-success">
                <Check className="h-4 w-4" />
              </span>
              <h3 className="mt-4 text-body-lg font-semibold text-fg-primary">{point.title}</h3>
              <p className="mt-2 text-body text-fg-secondary">{point.body}</p>
            </Card>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Native <details>, not a disclosure component: the platform already gives
 * keyboard operation, the open/closed state, and find-in-page over collapsed
 * answers, none of which a hand-rolled version would.
 */
export function Faq(): JSX.Element {
  return (
    <Section id="faq" eyebrow="FAQ" title="Questions people actually ask">
      <div className="max-w-3xl divide-y divide-border rounded-card border border-border bg-surface">
        {FAQS.map((faq, index) => (
          <Reveal key={faq.q} delay={index * 0.03}>
            <details className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-body-lg font-medium text-fg-primary">
                {faq.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted transition-transform duration-fast ease-calm group-open:rotate-180" />
              </summary>
              <p className="mt-3 max-w-2xl text-body text-fg-secondary">{faq.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Download                                                                    */
/* -------------------------------------------------------------------------- */

export function Downloads(): JSX.Element {
  return (
    <Section
      id="download"
      eyebrow="Download"
      title="Free, MIT-licensed, no sign-up"
      lead="Pick your platform. The build is unsigned, so Windows SmartScreen will warn on first run — More info, then Run anyway."
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {DOWNLOADS.map((download, index) => {
          const Icon = PLATFORM_ICONS[download.icon] ?? Monitor;
          return (
            <Reveal as="li" key={download.file} delay={index * 0.04}>
              <motion.a
                {...liftable}
                href={RELEASES_URL}
                className={cn(
                  'flex h-full items-start gap-4 rounded-card border border-border bg-surface p-5',
                  'transition-colors duration-fast ease-calm hover:bg-surface-hover',
                )}
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-hover text-fg-secondary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-body-lg font-semibold text-fg-primary">
                    {download.platform}
                    <Download className="h-4 w-4 text-fg-muted" />
                  </span>
                  <span className="mt-1 block truncate font-mono text-caption text-fg-muted">
                    {download.file}
                  </span>
                  <span className="mt-2 block text-body text-fg-secondary">{download.note}</span>
                </span>
              </motion.a>
            </Reveal>
          );
        })}
      </ul>

      <Reveal className="mt-8 flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <a href={RELEASES_URL} target="_blank" rel="noreferrer">
            All release artifacts
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
        <p className="text-caption text-fg-muted">{DOWNLOAD_NOTE}</p>
      </Reveal>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                      */
/* -------------------------------------------------------------------------- */

export function Footer({ children }: { readonly children?: JSX.Element }): JSX.Element {
  return (
    <footer className="border-t border-border py-14">
      <div className="mx-auto max-w-content px-6">{children}</div>
      <div className="mx-auto mt-10 flex max-w-content flex-col gap-3 px-6 text-caption text-fg-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          <AppIcon className="mr-2 inline h-4 w-4 align-[-2px] text-fg-muted" />
          {BRANDING.shortName} {BRANDING.version} · MIT licensed
        </p>
        <p>
          Not affiliated with any AI provider. {BRANDING.appName} is a placeholder name until the real one
          lands.
        </p>
      </div>
    </footer>
  );
}
