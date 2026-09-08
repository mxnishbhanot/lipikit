import { Github } from 'lucide-react';
import { AppIcon, Button, cn } from '@ai-anywhere/ui';
import { BRANDING } from '@ai-anywhere/shared';
import { FOOTER_LINKS, NAV_LINKS, REPO_URL } from './content.js';
import { Reveal, ThemeToggle } from './components.js';
import {
  Downloads,
  Faq,
  Features,
  Footer,
  Hero,
  Privacy,
  Providers,
  Screenshots,
  Shortcuts,
  WorksEverywhere,
} from './sections.js';

/**
 * Sticky, translucent, hairline underneath. No scroll listener: `backdrop-blur`
 * over a semi-opaque surface reads as raised at every offset, so there is no
 * state to track and nothing to recalculate on a scroll event.
 */
function Nav(): JSX.Element {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center gap-6 px-6">
        <a href="#top" className="flex shrink-0 items-center gap-2 text-body font-semibold">
          <AppIcon className="h-6 w-6 text-accent" label={BRANDING.shortName} />
          <span className="text-fg-primary">{BRANDING.shortName}</span>
        </a>

        {/* Hidden below `lg`, where the links would wrap onto a second row.
            Every one of them is a jump to a section the page already scrolls
            through, so a burger menu would be a drawer to reach content that
            is three swipes away. */}
        <ul className="ml-4 hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-body text-fg-secondary transition-colors duration-fast ease-calm hover:text-fg-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Source on GitHub"
            className={cn(
              'hidden h-9 w-9 items-center justify-center rounded-control border border-border',
              'bg-surface text-fg-secondary transition-colors duration-fast ease-calm',
              'hover:bg-surface-hover hover:text-fg-primary sm:inline-flex',
            )}
          >
            <Github className="h-4 w-4" />
          </a>
          <ThemeToggle />
          <Button asChild size="sm">
            <a href="#download">Download</a>
          </Button>
        </div>
      </div>
    </nav>
  );
}

function FooterLinks(): JSX.Element {
  return (
    <div className="grid gap-10 sm:grid-cols-[1fr_auto_auto]">
      <Reveal className="max-w-sm">
        <p className="flex items-center gap-2 text-body font-semibold text-fg-primary">
          <AppIcon className="h-5 w-5 text-accent" />
          {BRANDING.shortName}
        </p>
        <p className="mt-3 text-body text-fg-secondary">{BRANDING.tagline}</p>
      </Reveal>

      {FOOTER_LINKS.map((column) => (
        <Reveal key={column.heading}>
          <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-fg-muted">
            {column.heading}
          </h2>
          <ul className="mt-4 space-y-2.5">
            {column.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  {...(link.href.startsWith('#') ? {} : { target: '_blank', rel: 'noreferrer' })}
                  className="text-body text-fg-secondary transition-colors duration-fast ease-calm hover:text-fg-primary"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      ))}
    </div>
  );
}

/**
 * The page, in the order it is read. Sections own their own copy and layout;
 * this file only decides the order and the chrome around them.
 */
export function App(): JSX.Element {
  return (
    <>
      {/* Keyboard-first product, keyboard-first page. */}
      <a
        href="#features"
        className={cn(
          'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]',
          'focus:rounded-control focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground',
        )}
      >
        Skip to content
      </a>

      <div id="top" />
      <Nav />
      <main>
        <Hero />
        <Features />
        <WorksEverywhere />
        <Providers />
        <Screenshots />
        <Shortcuts />
        <Privacy />
        <Faq />
        <Downloads />
      </main>
      <Footer>
        <FooterLinks />
      </Footer>
    </>
  );
}
