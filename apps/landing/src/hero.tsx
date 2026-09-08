import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CornerDownLeft,
  Copy,
  Github,
  MessageSquare,
  Monitor,
  RotateCcw,
  Search,
  Terminal,
} from 'lucide-react';
import { BRANDING } from '@ai-anywhere/shared';
import { Badge, Button, Kbd, cn, transition } from '@ai-anywhere/ui';
import { HERO, HOTKEY, POSITIONING, RELEASES_URL, REPO_URL } from './content.js';
import { Reveal, WindowFrame } from './components.js';

/**
 * Above the fold, in its own module.
 *
 * The split is what makes the rest of the page a separate chunk: the hero is
 * the only thing a visitor is guaranteed to see, and everything below it —
 * nine sections, their icons and their copy — is fetched while they read this.
 */

/** The mock palette in the hero: what the popup offers in a Slack window. */
const MOCK_COMMANDS: readonly { readonly label: string; readonly group: string }[] = [
  { label: 'Slack Reply', group: 'Communication' },
  { label: 'Professional', group: 'Writing' },
  { label: 'Summarize', group: 'Productivity' },
  { label: 'Translate', group: 'Writing' },
];

/** What the mocked command streams back. */
const ANSWER =
  'Heads up: the payment retry job had been stuck since Friday. A fix is deployed and the queue is draining now — expect it clear within the hour.';

/**
 * The loop the popup plays: the palette it opens on, then the answer view the
 * command runs into. Two phases and no third, because that is what the app
 * actually does — a hero that invents a screen is a promise to support it.
 *
 * The palette phase is short enough to read the top row and long enough not to
 * flicker; the answer phase holds after streaming so the text can be read.
 */
const LOOP = [
  { phase: 'palette', ms: 1_800 },
  { phase: 'result', ms: 4_600 },
] as const;

type Phase = (typeof LOOP)[number]['phase'];

/**
 * Steps the loop, and hands back a cycle counter so the keypress animation can
 * be re-keyed on each pass. `still` freezes it on the palette: someone who
 * asked the OS for no motion wants a picture, not a slower film.
 */
function useHeroLoop(still: boolean): { readonly phase: Phase; readonly cycle: number } {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (still) return;
    const current = LOOP[step % LOOP.length];
    const timer = window.setTimeout(() => setStep((value) => value + 1), current?.ms ?? 2_000);
    return () => window.clearTimeout(timer);
  }, [step, still]);

  if (still) return { phase: 'palette', cycle: 0 };
  return {
    phase: LOOP[step % LOOP.length]?.phase ?? 'palette',
    cycle: Math.floor(step / LOOP.length),
  };
}

/**
 * Reveals `text` a word at a time while `active`, which is what the popup
 * looks like on a real call: tokens arrive in clumps, not characters. Word by
 * word rather than letter by letter also means no reflow mid-word.
 */
function useStreamedWords(text: string, active: boolean): string {
  const words = text.split(' ');
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!active) {
      setShown(0);
      return;
    }
    const timer = window.setInterval(() => setShown((count) => Math.min(count + 1, words.length)), 55);
    return () => window.clearInterval(timer);
  }, [active, words.length]);

  return words.slice(0, shown).join(' ');
}

/** The two key caps, depressing once per loop as the popup opens. */
function HotkeyPress({ cycle, still }: { readonly cycle: number; readonly still: boolean }): JSX.Element {
  if (still) return <Kbd combo={HOTKEY} />;
  return (
    <motion.span
      key={cycle}
      className="inline-flex"
      initial={{ y: 0 }}
      animate={{ y: [0, 2.5, 0] }}
      transition={{ duration: 0.32, times: [0, 0.4, 1], ease: 'easeOut' }}
    >
      <Kbd combo={HOTKEY} />
    </motion.span>
  );
}

/**
 * The app underneath the popup: a Slack message with the selection highlighted.
 * Drawn, not screenshotted, for the same reason as `WindowFrame` — and it is
 * the whole story of the product in one picture, so the hero leads with the
 * app the reader was already in rather than with our own UI.
 */
function HeroStage(): JSX.Element {
  const still = useReducedMotion() === true;
  const { phase, cycle } = useHeroLoop(still);

  return (
    // Hidden from assistive tech: it is a drawing of the app on a loop, and a
    // half-streamed sentence re-announced every six seconds is noise. The
    // headline and subline above already say everything it shows.
    <div aria-hidden className="relative w-full max-w-3xl">
      <WindowFrame title="#team-payments — Slack" className="text-left">
        <div className="space-y-3 p-5 pb-24 sm:pb-28">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-control bg-accent-subtle text-caption font-semibold text-accent">
              PM
            </span>
            <span className="text-caption font-medium text-fg-primary">Priya</span>
            <span className="text-caption text-fg-muted">11:42</span>
          </div>
          <p className="text-body text-fg-secondary sm:max-w-[44%]">
            {/* The highlight is the point: the text is already selected when the
                hotkey is pressed, so nothing is copied and nothing is pasted. */}
            <span className="rounded bg-accent/20 px-1 py-0.5 text-fg-primary">
              hey all — payment retry job was stuck since friday, pushed a fix, its draining the queue now,
              should be clear in an hour, sorry for the noise
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-caption text-fg-muted">
            Selected, then <HotkeyPress cycle={cycle} still={still} />
          </p>
        </div>
      </WindowFrame>

      {/* Overlapping, not beside: the popup opens over the app you are in. On a
          phone it sits under the window instead, where 320px cannot hold both. */}
      <div className="mt-4 sm:absolute sm:-bottom-10 sm:right-0 sm:mt-0 sm:w-[26rem]">
        <HeroPopup phase={phase} still={still} />
      </div>
    </div>
  );
}

function PaletteBody({ still }: { readonly still: boolean }): JSX.Element {
  return (
    <>
      {/* The context chip: why these commands, in the app's own words. */}
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
        <Badge tone="accent" className="gap-1.5">
          <MessageSquare className="h-3 w-3" />
          Slack detected
        </Badge>
        <span className="truncate text-caption text-fg-muted">prompt tuned for a team channel</span>
      </div>

      <ul className="p-2">
        {MOCK_COMMANDS.map((command, index) => (
          <motion.li
            key={command.label}
            // The rows settle in one after another, which is the app's own
            // list stagger — the popup does this every time it opens.
            initial={still ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition(), delay: still ? 0 : 0.06 + index * 0.05 }}
            className={cn(
              'flex items-center gap-3 rounded-control px-3 py-2.5 text-body',
              index === 0 ? 'bg-accent-subtle text-accent' : 'text-fg-secondary',
            )}
          >
            <span className="font-medium">{command.label}</span>
            <span className="truncate text-caption text-fg-muted">{command.group}</span>
            {index === 0 && (
              <span className="ml-auto shrink-0">
                <Kbd>Enter</Kbd>
              </span>
            )}
          </motion.li>
        ))}
      </ul>
    </>
  );
}

function ResultBody({ still }: { readonly still: boolean }): JSX.Element {
  const streamed = useStreamedWords(ANSWER, !still);
  const done = streamed.length === ANSWER.length;

  return (
    <div className="p-3">
      <div className="min-h-[11.25rem] rounded-card border border-border bg-surface p-3 text-body text-fg-primary">
        {streamed}
        {done ? null : (
          <motion.span
            className="ml-0.5 inline-block h-4 w-[2px] translate-y-[2px] bg-accent"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 0.9, times: [0, 0.49, 0.5, 1], repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The popup, playing the two screens it really has.
 *
 * `mode="wait"` between them for the same reason the app uses it: two bodies
 * cross-fading on top of each other in a 420px window reads as a glitch. The
 * body carries a min-height so the swap does not resize the frame under the
 * reader's eye.
 */
function HeroPopup({ phase, still }: { readonly phase: Phase; readonly still: boolean }): JSX.Element {
  const result = phase === 'result';

  return (
    <WindowFrame className="w-full rounded-popup text-left shadow-popup">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        {result ? (
          <>
            <ArrowLeft className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="truncate text-body font-medium text-fg-primary">Slack Reply</span>
          </>
        ) : (
          <>
            <Search className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="truncate text-body text-fg-muted">Search commands…</span>
          </>
        )}
        <span className="ml-auto shrink-0">
          <Badge tone="accent">GPT-5 mini</Badge>
        </span>
      </div>

      <div className="min-h-[13.5rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phase}
            initial={still ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={transition()}
          >
            {result ? <ResultBody still={still} /> : <PaletteBody still={still} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-caption text-fg-muted">
        {result ? (
          <>
            <span className="inline-flex items-center gap-1">
              <RotateCcw className="h-3 w-3" />
              Retry
            </span>
            <span className="inline-flex items-center gap-1">
              <Copy className="h-3 w-3" />
              Copy
            </span>
            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-control bg-accent px-2 py-1 text-accent-foreground">
              <CornerDownLeft className="h-3 w-3" />
              Replace
            </span>
          </>
        ) : (
          <>
            <Kbd combo="Ctrl+Enter" />
            <span className="truncate">replace selection</span>
            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>420 ms</span>
            </span>
          </>
        )}
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

      <div className="relative mx-auto max-w-content px-6 pb-24 pt-16 text-center sm:pb-36 sm:pt-24">
        <Reveal>
          <a
            href={RELEASES_URL}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-1.5',
              'text-caption text-fg-secondary transition-colors duration-fast ease-calm hover:bg-surface-hover',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {BRANDING.version} beta for Windows and Ubuntu
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 className="mx-auto mt-8 max-w-4xl text-hero-lg font-semibold text-fg-primary">
            {HERO.headline}
            <br />
            <span className="text-accent">{HERO.headlineAccent}</span>
          </h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-body-lg text-fg-secondary sm:text-lg">{HERO.sub}</p>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-3 max-w-2xl text-body text-fg-muted">{POSITIONING}</p>
        </Reveal>

        {/* One button per platform: the reader knows which machine they are on,
            and a single "Download" that opens a section is a click spent
            asking them a question they already answered. */}
        <Reveal delay={0.15} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <a href="#download">
              <Monitor className="h-4 w-4" />
              Download for Windows
            </a>
          </Button>
          <Button asChild size="lg">
            <a href="#download">
              <Terminal className="h-4 w-4" />
              Download for Ubuntu
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </Button>
        </Reveal>

        <Reveal delay={0.18} className="mt-5 space-y-2">
          <p className="text-caption text-fg-muted">{HERO.note}</p>
          {/* Not "watch the demo": there is no video yet, and a play button
              that scrolls is a lie. This goes to the four worked examples. */}
          <a
            href="#workflows"
            className="inline-flex items-center gap-1.5 text-body text-accent underline-offset-4 hover:underline"
          >
            See it in four real workflows
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Reveal>

        <Reveal delay={0.25} className="mt-16 flex justify-center">
          <HeroStage />
        </Reveal>
      </div>
    </header>
  );
}
