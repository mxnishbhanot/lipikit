import { ACCENT_COLORS, type AccentColor, type AppSettings } from '@lipikit/shared';
import { cn } from '@lipikit/ui';
import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { Group, Row, SettingsPage } from '../fields.js';

const THEMES: readonly { value: AppSettings['theme']; label: string; icon: LucideIcon; hint: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, hint: 'Always light' },
  { value: 'dark', label: 'Dark', icon: Moon, hint: 'Always dark' },
  { value: 'system', label: 'System', icon: Monitor, hint: 'Follows the OS' },
];

/**
 * Swatch colours only. The accents themselves live in globals.css under
 * `[data-accent]`, and only one of them is loaded at a time — a swatch cannot
 * paint itself with a variable for an accent that is not active, so the picker
 * carries its own preview values.
 */
const SWATCH: Record<AccentColor, string> = {
  emerald: 'hsl(160 84% 39%)',
  blue: 'hsl(221 83% 53%)',
  violet: 'hsl(262 72% 57%)',
  amber: 'hsl(35 92% 50%)',
  rose: 'hsl(346 77% 52%)',
};

export function AppearancePage({
  settings,
  patch,
}: {
  settings: AppSettings;
  patch: (value: Partial<AppSettings>) => void;
}): JSX.Element {
  return (
    <SettingsPage
      title="Appearance"
      description="Applies to this window and to the popup. Nothing here leaves the machine."
    >
      <Group
        title="Theme"
        description="“System” keeps following the OS while the window is open, not just at startup."
      >
        <Row label="Interface theme" stack>
          <div className="grid w-full grid-cols-3 gap-3" role="radiogroup" aria-label="Interface theme">
            {THEMES.map(({ value, label, icon: Icon, hint }) => {
              const active = settings.theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => patch({ theme: value })}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-control border p-3 text-left',
                    'transition-colors duration-fast ease-calm',
                    active
                      ? 'border-accent bg-accent-subtle'
                      : 'border-border bg-surface hover:bg-surface-hover',
                  )}
                >
                  <Icon aria-hidden className={cn('h-4 w-4', active ? 'text-accent' : 'text-fg-muted')} />
                  <span className={cn('text-body font-medium', active ? 'text-accent' : 'text-fg-primary')}>
                    {label}
                  </span>
                  <span className="text-caption text-fg-muted">{hint}</span>
                </button>
              );
            })}
          </div>
        </Row>
      </Group>

      <Group title="Accent" description="Tints selection, focus rings and primary buttons.">
        <Row label="Accent colour" hint="Every option is checked for contrast against both themes.">
          <div className="flex items-center gap-2" role="radiogroup" aria-label="Accent colour">
            {ACCENT_COLORS.map((accent) => {
              const active = settings.accentColor === accent;
              return (
                <button
                  key={accent}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={accent}
                  title={accent}
                  onClick={() => patch({ accentColor: accent })}
                  style={{ backgroundColor: SWATCH[accent] }}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-white',
                    'transition-transform duration-fast ease-calm hover:scale-105',
                    active ? 'ring-2 ring-fg-primary ring-offset-2 ring-offset-surface' : '',
                  )}
                >
                  {active ? <Check aria-hidden className="h-3.5 w-3.5" /> : null}
                </button>
              );
            })}
          </div>
        </Row>
      </Group>
    </SettingsPage>
  );
}
