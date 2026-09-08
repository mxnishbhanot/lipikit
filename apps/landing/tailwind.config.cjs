const preset = require('@ai-anywhere/ui/tailwind-preset');

/**
 * The app's design tokens, plus the two type sizes only a marketing page needs.
 * The app's scale tops out at `text-hero` (36px), which is right for a 560px
 * popup and far too small for a landing hero, so the page extends the scale
 * rather than hard-coding pixel classes in the sections.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontSize: {
        'hero-lg': ['clamp(2.5rem, 7vw, 4.5rem)', { lineHeight: '1.05', letterSpacing: '-0.035em' }],
        'section-title': ['clamp(1.75rem, 3.5vw, 2.75rem)', { lineHeight: '1.15', letterSpacing: '-0.03em' }],
      },
      maxWidth: { content: '72rem' },
    },
  },
};
