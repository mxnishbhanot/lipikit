/**
 * Single source of design tokens. The desktop app consumes this preset, so a
 * token change lands everywhere at once instead of drifting per app.
 *
 * Every value here only *names* a CSS variable declared in the app's
 * globals.css. That split is deliberate: the preset decides what utilities
 * exist, the variables decide what they look like per theme, and neither file
 * has to know about the other's halves.
 *
 * @type {import('tailwindcss').Config}
 */

/** hsl(var(--x) / <alpha-value>) so `bg-surface/60` keeps working. */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        surface: {
          DEFAULT: token('surface'),
          hover: token('surface-hover'),
          elevated: token('surface-elevated'),
        },
        border: token('border'),
        // Named `fg` so the utilities read `text-fg-secondary`, not
        // `text-text-secondary`.
        fg: {
          primary: token('text-primary'),
          secondary: token('text-secondary'),
          muted: token('text-muted'),
        },
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
          subtle: token('accent-subtle'),
        },
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
        info: token('info'),

        // shadcn/ui names the generated primitives were written against.
        // They alias the tokens above in globals.css.
        input: token('input'),
        ring: token('ring'),
        foreground: token('foreground'),
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground') },
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },
      },

      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'Segoe UI', 'Ubuntu', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Cascadia Code', 'Ubuntu Mono', 'monospace'],
      },

      /**
       * Semantic type scale. Components name the role, never the pixel size,
       * so the scale can be retuned without a find-and-replace over the app.
       * Line heights are baked in: a size is not a decision on its own.
       */
      fontSize: {
        caption: ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        body: ['14px', { lineHeight: '20px' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        title: ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        heading: ['24px', { lineHeight: '32px', letterSpacing: '-0.015em' }],
        display: ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
        hero: ['36px', { lineHeight: '42px', letterSpacing: '-0.025em' }],
      },

      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        popup: 'var(--radius-popup)',
        modal: 'var(--radius-modal)',
        // shadcn primitives use lg/md/sm; map them onto the control radius so
        // an un-migrated component still lands on the scale.
        lg: 'var(--radius-control)',
        md: 'calc(var(--radius-control) - 4px)',
        sm: 'calc(var(--radius-control) - 6px)',
      },

      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        popup: 'var(--shadow-popup)',
        none: 'none',
      },

      transitionDuration: {
        fast: '150ms',
        DEFAULT: '175ms',
        slow: '200ms',
      },

      transitionTimingFunction: {
        // One easing for entrances and hovers. Calm means no overshoot.
        calm: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
};
