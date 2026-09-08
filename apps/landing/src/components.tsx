import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { cn, DURATION, EASE } from '@ai-anywhere/ui';
import { resolveTheme, THEME_KEY, type ThemeChoice } from './theme.js';

/**
 * Page-level building blocks. The app's own primitives (Button, Card, Kbd,
 * Badge) come straight from @ai-anywhere/ui and are used as-is; only the three
 * things a marketing page needs and an app does not live here.
 */

/**
 * Marketing motion is slower and travels further than the app's — a page is
 * scrolled, not operated, and the app's 175ms is invisible at this scale. The
 * easing is still the design system's, so the two never feel like two brands.
 */
const REVEAL_DURATION = DURATION.slow * 2.5;

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: REVEAL_DURATION, ease: EASE } },
};

export interface RevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  /** Seconds. Use for siblings that should land one after another. */
  readonly delay?: number;
  readonly as?: 'div' | 'section' | 'li' | 'header' | 'footer';
}

/**
 * Fades a block in the first time it scrolls into view, and never again:
 * re-animating on the way back up turns a scroll into a strobe.
 *
 * Reduced motion is honoured by rendering the visible state immediately rather
 * than by a shorter animation — someone who asked for no motion wants none,
 * not less.
 */
export function Reveal({ children, className, delay = 0, as = 'div' }: RevealProps): JSX.Element {
  const still = useReducedMotion();
  const Component = motion[as];

  if (still === true) return <Component className={className}>{children}</Component>;

  return (
    <Component
      className={className}
      variants={revealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -80px 0px' }}
      transition={{ delay }}
    >
      {children}
    </Component>
  );
}

export interface SectionProps {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: ReactNode;
  readonly lead?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * One section rhythm for the whole page: the same vertical padding, the same
 * eyebrow-title-lead stack, the same content width. Ten sections written by
 * hand would be ten slightly different pages.
 */
export function Section({ id, eyebrow, title, lead, children, className }: SectionProps): JSX.Element {
  return (
    <section id={id} className={cn('scroll-mt-24 border-t border-border/60 py-20 sm:py-28', className)}>
      <div className="mx-auto max-w-content px-6">
        <Reveal className="max-w-2xl">
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
          <h2 className="mt-3 text-section-title font-semibold text-fg-primary">{title}</h2>
          {lead !== undefined && <p className="mt-4 text-body-lg text-fg-secondary">{lead}</p>}
        </Reveal>
        <div className="mt-12 sm:mt-16">{children}</div>
      </div>
    </section>
  );
}

/**
 * Light/dark, remembered. Deliberately two states and not three: 'system' is
 * the default until someone touches this, which is what the missing key
 * already means, so a tri-state control would add a click to say nothing.
 */
export function ThemeToggle(): JSX.Element {
  const [theme, setTheme] = useState<ThemeChoice>(() =>
    typeof document === 'undefined' || !document.documentElement.classList.contains('dark')
      ? 'light'
      : 'dark',
  );

  // Only while untouched: once a visitor has chosen, an OS switch must not
  // undo the choice.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const follow = (): void => {
      if (localStorage.getItem(THEME_KEY) === null) setTheme(resolveTheme(null, media.matches));
    };
    media.addEventListener('change', follow);
    return () => media.removeEventListener('change', follow);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Native controls, scrollbars and form widgets follow this, not the class.
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggle = useCallback((): void => {
    setTheme((current) => {
      const next: ThemeChoice = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // Private mode denies storage; the toggle still works for this visit.
      }
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-control border border-border',
        'bg-surface text-fg-secondary transition-colors duration-fast ease-calm',
        'hover:bg-surface-hover hover:text-fg-primary',
      )}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export interface WindowFrameProps {
  readonly children: ReactNode;
  readonly className?: string;
  /** Shown in the title bar; omit for the popup, which has no title bar. */
  readonly title?: string;
}

/**
 * A desktop window, drawn rather than screenshotted.
 *
 * ponytail: the real product screenshots are not cut yet, and a page that
 * ships four PNGs would need them re-cut for both themes and every UI change.
 * These frames are built from the same tokens as the app, so they track it for
 * free and stay sharp at any width. Swap in real captures when there are some:
 * only this component and the Screenshots section change.
 */
export function WindowFrame({ children, className, title }: WindowFrameProps): JSX.Element {
  return (
    <div className={cn('overflow-hidden rounded-card border border-border bg-surface shadow-lg', className)}>
      {title !== undefined && (
        <div className="flex items-center gap-2 border-b border-border bg-surface-hover/60 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-fg-muted/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-fg-muted/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-fg-muted/40" />
          <span className="ml-2 truncate text-caption text-fg-muted">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}
