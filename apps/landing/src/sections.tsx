import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bug,
  Check,
  ChevronDown,
  Code,
  Compass,
  CornerDownLeft,
  Download,
  FileCode,
  GitPullRequest,
  History,
  KeyRound,
  Keyboard,
  Layers,
  MessageSquare,
  Minus,
  Monitor,
  Replace,
  Ticket,
  Terminal,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { BRANDING } from '@ai-anywhere/shared';
import { AppIcon, Badge, Button, Card, cn, Kbd, liftable } from '@ai-anywhere/ui';
import {
  BYOK_CARDS,
  BYOK_POINTS,
  COMPARISON_NOTE,
  COMPARISON_PRODUCTS,
  COMPARISON_ROWS,
  DOWNLOADS,
  DOWNLOAD_NOTE,
  FAQS,
  FEATURES,
  HOTKEY,
  PERSONAS,
  PLATFORMS,
  PLATFORM_NOTE,
  PRIVACY_POINTS,
  PROVIDERS,
  PROVIDER_NOTE,
  RELEASES_URL,
  ROADMAP,
  SHORTCUT_GROUPS,
  STEPS,
  WORKFLOW_DEMOS,
  type Cell,
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
/* Who it is for                                                               */
/* -------------------------------------------------------------------------- */

const PERSONA_ICONS: Record<string, LucideIcon> = { Code, Compass, Bug, Users };

export function WhoItsFor(): JSX.Element {
  return (
    <Section
      id="who"
      eyebrow="Who it's for"
      title="Written for the tabs you keep switching to"
      lead="Four kinds of reader, and the applications they already have open. Every job named on a card is a command that ships in the palette."
    >
      <ul className="grid gap-5 sm:grid-cols-2">
        {PERSONAS.map((persona, index) => {
          const Icon = PERSONA_ICONS[persona.icon] ?? Users;
          return (
            <Reveal as="li" key={persona.role} delay={index * 0.04}>
              <motion.div {...liftable} className="h-full">
                <Card className="flex h-full flex-col p-6">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-control bg-accent-subtle text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-title font-semibold text-fg-primary">{persona.role}</h3>
                  </div>
                  <p className="mt-3 text-body text-fg-secondary">{persona.body}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {persona.apps.map((app) => (
                      <Badge key={app}>{app}</Badge>
                    ))}
                  </div>

                  {/* The jobs, not the features: "PR description" is a thing
                      someone has to write on Thursday, "AI-powered generation"
                      is not. */}
                  <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-4">
                    {persona.jobs.map((job) => (
                      <li key={job} className="flex items-start gap-2 text-body text-fg-secondary">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                        {job}
                      </li>
                    ))}
                  </ul>
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
/* Workflow demos                                                              */
/* -------------------------------------------------------------------------- */

const DEMO_ICONS: Record<string, LucideIcon> = {
  MessageSquare,
  GitPullRequest,
  Terminal,
  Ticket,
};

/**
 * One worked example, told in the order it happens: what was selected, which
 * row the popup put first and why, and what ended up in the field. Three
 * panels rather than a carousel — a story the reader has to press play on is
 * a story most readers skip.
 */
function WorkflowStory({
  demo,
  index,
}: {
  readonly demo: (typeof WORKFLOW_DEMOS)[number];
  readonly index: number;
}): JSX.Element {
  const Icon = DEMO_ICONS[demo.icon] ?? MessageSquare;
  return (
    <Reveal as="li" delay={index * 0.04}>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-hover/50 px-5 py-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-control bg-accent-subtle text-accent">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-body-lg font-semibold text-fg-primary">{demo.app}</h3>
          <Badge tone="accent" className="ml-auto">
            {demo.detected}
          </Badge>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
          <div>
            <p className="text-caption font-medium uppercase tracking-[0.14em] text-fg-muted">Selected</p>
            <p className="mt-2 rounded-control bg-accent/[0.12] p-3 text-body text-fg-secondary">
              {demo.before}
            </p>
          </div>

          {/* The keystroke, between the two panels: on a phone it stacks and
              still reads as the step in the middle. */}
          <div className="flex items-center gap-2 lg:h-full lg:flex-col lg:justify-center lg:px-2">
            <Kbd combo={HOTKEY} />
            <span className="inline-flex items-center gap-1.5 rounded-control border border-accent/30 bg-accent-subtle px-2.5 py-1 text-caption font-medium text-accent">
              {demo.command}
              <CornerDownLeft className="h-3 w-3" />
            </span>
          </div>

          <div>
            <p className="text-caption font-medium uppercase tracking-[0.14em] text-fg-muted">
              Replaced with
            </p>
            <p className="mt-2 whitespace-pre-line rounded-control border border-border bg-surface-hover/60 p-3 text-body text-fg-primary">
              {demo.after}
            </p>
          </div>
        </div>
      </Card>
    </Reveal>
  );
}

export function Workflows(): JSX.Element {
  return (
    <Section
      id="workflows"
      eyebrow="Workflows"
      title="Four things you did today without it"
      lead="Highlight, one shortcut, carry on. The popup reads which application you are in and puts that app's command first — these are the real rules, not a mock-up."
    >
      <ul className="space-y-5">
        {WORKFLOW_DEMOS.map((demo, index) => (
          <WorkflowStory key={demo.app} demo={demo} index={index} />
        ))}
      </ul>
      <Reveal>
        <p className="mt-6 text-caption text-fg-muted">
          Sample text is invented; the command names, the detected apps and the instructions behind them are
          the ones the app ships with.
        </p>
      </Reveal>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Comparison                                                                  */
/* -------------------------------------------------------------------------- */

/** A cell: yes, no, or a qualifier that has to be read. */
function CompareCell({ value, own }: { readonly value: Cell; readonly own: boolean }): JSX.Element {
  if (value === true) {
    return (
      <span
        className={cn('inline-flex items-center gap-1.5 text-body', own ? 'text-accent' : 'text-success')}
      >
        <Check className="h-4 w-4" aria-hidden />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center text-fg-muted">
        <Minus className="h-4 w-4" aria-hidden />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return <span className="text-caption text-fg-secondary">{value}</span>;
}

export function Compare(): JSX.Element {
  return (
    <Section
      id="compare"
      eyebrow="Compare"
      title="What the other tabs do instead"
      lead="These are good tools; they are just built for different jobs. The row that matters is the first one — whether the AI comes to the window you are already typing in."
    >
      {/* The table scrolls inside its own box rather than making the page
          scroll sideways; the first column stays put so a row keeps its name. */}
      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full min-w-[52rem] border-collapse text-left">
          <caption className="sr-only">
            Feature comparison between {BRANDING.shortName} and four other tools
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="sticky left-0 bg-surface px-5 py-4 text-body font-semibold text-fg-primary"
              >
                Feature
              </th>
              {COMPARISON_PRODUCTS.map((product, index) => (
                <th
                  key={product}
                  scope="col"
                  className={cn(
                    'px-4 py-4 text-caption font-semibold',
                    index === 0 ? 'text-accent' : 'text-fg-secondary',
                  )}
                >
                  {index === 0 ? BRANDING.shortName : product}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.feature} className="border-b border-border/60 last:border-0">
                <th
                  scope="row"
                  className="sticky left-0 bg-surface px-5 py-3.5 text-body font-normal text-fg-secondary"
                >
                  {row.feature}
                </th>
                {row.cells.map((cell, index) => (
                  <td
                    key={`${row.feature}:${COMPARISON_PRODUCTS[index] ?? index}`}
                    className={cn('px-4 py-3.5', index === 0 && 'bg-accent-subtle/40')}
                  >
                    <CompareCell value={cell} own={index === 0} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Reveal>
        <p className="mt-6 max-w-3xl text-caption text-fg-muted">{COMPARISON_NOTE}</p>
      </Reveal>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Bring your own key                                                          */
/* -------------------------------------------------------------------------- */

export function Byok(): JSX.Element {
  return (
    <Section
      id="byok"
      eyebrow="Your own key"
      title="You already pay an AI provider. Use that."
      lead="Paste a key from whichever vendor you have an account with. The app is free and MIT-licensed; the model bill goes straight to them, at their prices."
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BYOK_CARDS.map((card, index) => (
          <Reveal as="li" key={card.label} delay={index * 0.03}>
            <motion.div {...liftable} className="h-full">
              <Card className="flex h-full flex-col gap-2 p-5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-control bg-accent-subtle text-accent">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <h3 className="text-body-lg font-semibold text-fg-primary">{card.label}</h3>
                </div>
                <p className="text-body text-fg-secondary">{card.models}</p>
                <p className="mt-auto pt-2 text-caption text-fg-muted">{card.billing}</p>
              </Card>
            </motion.div>
          </Reveal>
        ))}
      </ul>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        {BYOK_POINTS.map((point, index) => (
          <Reveal key={point.title} delay={index * 0.04}>
            <Card className="h-full p-6">
              <h3 className="text-body-lg font-semibold text-fg-primary">{point.title}</h3>
              <p className="mt-2 text-body text-fg-secondary">{point.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <p className="mt-6 text-caption text-fg-muted">{PROVIDER_NOTE}</p>
      </Reveal>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Roadmap                                                                     */
/* -------------------------------------------------------------------------- */

export function Roadmap(): JSX.Element {
  return (
    <Section
      id="roadmap"
      eyebrow="Roadmap"
      title="Shipped, next, and wanted"
      lead="Three columns so the line between what you get today and what is planned is impossible to misread. Only the first column is in the download."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {ROADMAP.map((column, index) => (
          <Reveal key={column.heading} delay={index * 0.05}>
            <Card
              className={cn(
                'h-full p-6',
                // Shipped is the loud one; the other two are deliberately
                // quieter than everything around them.
                column.state === 'now' ? 'border-accent/40' : 'bg-surface/60',
              )}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-title font-semibold text-fg-primary">{column.heading}</h3>
                <Badge tone={column.state === 'now' ? 'success' : 'neutral'}>
                  {column.state === 'now' ? 'Available' : column.state === 'next' ? 'In progress' : 'Idea'}
                </Badge>
              </div>
              <p className="mt-2 text-caption text-fg-muted">{column.note}</p>
              <ul className="mt-5 space-y-2.5">
                {column.items.map((item) => (
                  <li
                    key={item}
                    className={cn(
                      'flex items-start gap-2 text-body',
                      column.state === 'now' ? 'text-fg-secondary' : 'text-fg-muted',
                    )}
                  >
                    {column.state === 'now' ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                    ) : (
                      <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden />
                    )}
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* The page under the hero                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every section below the fold, in reading order. It lives here rather than in
 * App so that the whole set — sections, icons, copy — is one lazily-fetched
 * chunk; App only knows the hero and the chrome.
 *
 * The order is an argument: what it does for you, who you are, how it does it,
 * why not the alternative, what it costs, what it keeps private, then the
 * details and the download.
 */
export function BelowTheFold(): JSX.Element {
  return (
    <>
      <Workflows />
      <WhoItsFor />
      <Features />
      <WorksEverywhere />
      <Compare />
      <Byok />
      <Providers />
      <Privacy />
      <Screenshots />
      <Shortcuts />
      <Roadmap />
      <Faq />
      <Downloads />
    </>
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
