# Design System v1.0

Premium, calm, minimal. Neutral UI, one emerald accent, keyboard-first,
generous whitespace. Native-feeling on both Windows and Ubuntu, which mostly
means: no platform-specific chrome, system font stack behind Inter, and
nothing that imitates one OS's widgets on the other.

Two files hold the whole system:

| File                              | Owns                                              |
| --------------------------------- | ------------------------------------------------- |
| `packages/ui/styles/tokens.css`   | Token **values**, per theme                       |
| `packages/ui/tailwind.preset.cjs` | Which **utilities** exist, named after the tokens |

The split is the point: the preset never contains a colour, and the CSS never
contains a class. Change a value in one place, in one theme, and every window
follows — including the landing page in `apps/landing`, which imports the same
two files. Both apps keep their own stylesheet
(`apps/desktop/src/styles/globals.css`, `apps/landing/src/styles.css`) for
rules that are genuinely theirs: window quirks and prose in one, page rhythm in
the other.

## Theme modes

`system` (default), `light`, `dark` — one row in settings, applied by
`apps/desktop/src/lib/theme-provider.tsx`, which toggles `.dark` on `<html>`
and sets `color-scheme` so native controls, scrollbars and the window frame
follow too. In `system` mode a `prefers-color-scheme` listener stays attached,
so an OS switch lands live in both the main window and the popup without a
restart. `resolveTheme` in `theme.ts` is the pure decision and is unit-tested.

`useThemeMode()` exposes `{ mode, resolved }` for the rare component that must
branch in JS rather than CSS. There is deliberately no `setTheme`: the
Appearance page writes the theme through the same settings mutation as every
other setting, and a second writer would drift from it.

## Colour tokens

Stored as bare HSL channels (`160 84% 34%`), so Tailwind can wrap them in
`hsl(var(--x) / <alpha-value>)` and `bg-surface/60` keeps working.

| Token                | Utility               | Role                                              |
| -------------------- | --------------------- | ------------------------------------------------- |
| `--background`       | `bg-background`       | Window ground                                     |
| `--surface`          | `bg-surface`          | Cards, inputs, rows                               |
| `--surface-hover`    | `bg-surface-hover`    | Row hover, secondary button — not a new surface   |
| `--surface-elevated` | `bg-surface-elevated` | Anything floating: dialogs, popovers              |
| `--border`           | `border-border`       | Every hairline, both themes                       |
| `--text-primary`     | `text-fg-primary`     | Body and headings                                 |
| `--text-secondary`   | `text-fg-secondary`   | Labels, secondary actions                         |
| `--text-muted`       | `text-fg-muted`       | Hints, legends — the only sub-body contrast       |
| `--accent`           | `bg-accent`           | Emerald. Primary action, selection, focus         |
| `--accent-subtle`    | `bg-accent-subtle`    | Selected row wash, where a solid fill would shout |
| `--success`          | `text-success`        | Completed, validated                              |
| `--warning`          | `text-warning`        | Degraded session, opt-in risk                     |
| `--danger`           | `text-danger`         | Destructive action, provider error                |
| `--info`             | `text-info`           | Neutral notice                                    |

The shadcn/ui names the existing primitives were generated against
(`--foreground`, `--card`, `--primary`, `--muted`, `--ring`, …) are kept as
**aliases** of the tokens above. That is why the nine settings pages did not
need rewriting for this sprint: the token set is the real API and the old names
resolve into it.

Emerald is the only chromatic colour in the neutral UI. It is lightened in dark
mode (`158 64% 48%`) because the light-theme emerald fails AA against a
near-black surface.

## Typography

Inter Variable, bundled via `@fontsource-variable/inter` and imported in
`main.tsx` — not a font CDN: the renderer has no network access to one and a
missing webfont would fall back mid-session. Fallback stack is
`system-ui, Segoe UI, Ubuntu`, which is the native face on each target OS.

Sizes are **semantic**, never pixel-named, and carry their line height:

| Utility        | Size | Use                                 |
| -------------- | ---- | ----------------------------------- |
| `text-caption` | 12   | Hints, shortcut legends, badges     |
| `text-body`    | 14   | Default. Every control and list row |
| `text-body-lg` | 16   | Result text, long-form output       |
| `text-title`   | 20   | Card and section titles             |
| `text-heading` | 24   | Settings page heading               |
| `text-display` | 30   | Onboarding                          |
| `text-hero`    | 36   | Hero only                           |

## Radius

| Utility           | Value | Applies to        |
| ----------------- | ----- | ----------------- |
| `rounded-control` | 12    | Inputs, buttons   |
| `rounded-card`    | 18    | Cards, panels     |
| `rounded-popup`   | 22    | The overlay popup |
| `rounded-modal`   | 24    | Modals            |

Inputs and buttons share a radius on purpose: a button beside a field should
read as one control group. `rounded-lg/md/sm` are mapped onto the control
radius so an un-migrated component still lands on the scale.

## Shadows

`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-popup` — very soft, and defined
**twice**, once per theme. A light theme leans on a tinted shadow; dark cannot
(a black shadow on near-black is invisible) and leans on a hairline highlight
instead. That is two token sets, not one set with an opacity.

## Glass

`.glass` is a utility, not a component class, because both the popup shell and
dialogs need it on their own element. It pairs `--glass-fill` with
`--glass-blur`; the two move together or the text stops being legible.

Gradients are reserved for hero and onboarding surfaces. Nothing in the popup,
settings or lists uses one.

## Motion

`framer-motion`. Tokens live in `packages/ui/src/lib/motion.ts`: three
durations (150 / 175 / 200ms), one easing (`cubic-bezier(0.22, 1, 0.36, 1)` —
decelerating, no overshoot), and three variants — `fade`, `scaleIn`, `slideUp`.

Reduced motion is one decision in one place: `<MotionConfig reducedMotion="user">`
in `AppProviders` makes framer-motion drop transforms tree-wide and keep only
opacity, so no variant checks the media query itself.

Hovers and colour changes stay in CSS (`duration-fast ease-calm`) — a
transition that does not need to be interruptible does not need a JS animation.

## Primitives

`packages/ui/src/components` — `Button`, `Input`, `Card` (+ header/title/
description/content/footer), `Badge`, `Kbd`.

They are **Storybook-ready** in the sense that matters: every one is
props-only, imports nothing from `apps/desktop`, reads no context, and does no
IPC — so a story or a test can render it standalone. Storybook itself is not
installed: a second build pipeline and its dependency tree, inside an Electron
app, for five primitives, buys less than it costs. Adding `.stories.tsx` files
later needs no change to the components.

- `Button` — `default` (the one emerald control on a screen), `secondary`,
  `outline`, `ghost`, `destructive`, `link`; sizes `sm | default | lg | icon`.
- `Card` — `default` (flat), `elevated` (floating), `glass` (the popup shell).
- `Badge` — status tones as tinted fills, never solid: a badge is a label.
- `Kbd` — splits `Ctrl+K` into one cap per key, so a combination stays legible
  at 12px instead of becoming one long pill. The app is keyboard-first and
  three surfaces print combinations.

## The popup

560px wide, adaptive height, `rounded-popup`, glass, `shadow-popup`.

- **Header** — search field (borderless: the popup _is_ the search box), the
  active model as a badge, settings, close. The field stays mounted across a
  command running and coming back, so focus never has to be restored.
- **Body** — grouped commands: the detected app's suggestions, Favorites,
  Recent, then Writing, Developer, Communication, Translation, AI and any
  group the user invented for their own prompts. One icon per group; the
  active row gets an accent rail (a `layoutId` that slides between rows)
  rather than a heavy fill.
- **Footer** — three shortcut hints, the last call's round-trip time (green
  under 1.5s, amber under 4s, red past it), a provider switch, and Recapture.

The window height is content-driven: a `ResizeObserver` on the shell reports
its height over `overlay:resize` and main clamps it to the display the popup
is on. Switching provider from the footer writes `defaultProvider` **and**
`defaultModel` together — a provider change alone would leave the app naming a
model the new vendor has never heard of.

Keyboard: `↑↓` (or `Ctrl+N`/`Ctrl+P`) move, `Tab`/`Shift+Tab` jump by section,
`Home`/`End` go to the ends, `Enter` runs, `Ctrl+D` favourites, `Ctrl+K`
focuses and clears the search, `Esc` steps back and then closes. Navigation is
a window-level listener because focus lives in the header field the whole time.

## What this sprint did not touch

AI behaviour, IPC, providers, the database — nothing below the renderer moved.
The nine settings pages still render through the shadcn aliases; migrating them
onto the semantic utilities (`text-fg-muted` over `text-muted-foreground`) is
cosmetic and can happen page by page.
