import { Select, Switch, cn } from '@lipikit/ui';
import type { ReactNode } from 'react';

/**
 * The settings vocabulary: a page header, grouped cards, and one row shape
 * that every setting fills. Rows carry their own label/description column and
 * their own divider, so a page is a list of settings rather than a grid the
 * page has to keep aligned — which is what let the old two-column layout drift
 * (a long hint stretched the label column for every row beside it).
 */

export function SettingsPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl px-8 py-7">
      <header className="flex items-start justify-between gap-4 pb-6">
        <div className="min-w-0">
          <h2 className="text-heading font-semibold tracking-tight">{title}</h2>
          {description === undefined ? null : (
            <p className="mt-1 max-w-prose text-caption text-fg-muted">{description}</p>
          )}
        </div>
        {actions === undefined ? null : <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className="space-y-8 pb-8">{children}</div>
    </div>
  );
}

/**
 * A titled card of rows. `flush` drops the card chrome for content that is
 * already a list of its own cards (history entries, provider cards), where a
 * card inside a card is two borders saying one thing.
 */
export function Group({
  title,
  description,
  flush,
  children,
}: {
  title?: string;
  description?: string;
  flush?: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="space-y-3">
      {title === undefined ? null : (
        <div className="px-1">
          <h3 className="text-body font-medium text-fg-secondary">{title}</h3>
          {description === undefined ? null : (
            <p className="mt-1 max-w-prose text-caption text-fg-muted">{description}</p>
          )}
        </div>
      )}
      <div
        className={cn(
          flush
            ? 'space-y-2'
            : 'divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-sm',
        )}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * One setting. The control sits right, vertically centred against the label,
 * and wraps under it below `sm` so a narrow window stacks instead of crushing
 * both columns. `stack` is for controls that need the full width (a hotkey
 * recorder beside a long label, a row of swatches).
 */
export function Row({
  label,
  hint,
  stack,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  stack?: boolean;
  children?: ReactNode;
}): JSX.Element {
  return (
    <div
      className={cn(
        'flex gap-4 px-4 py-3.5',
        stack ? 'flex-col' : 'flex-col sm:flex-row sm:items-center sm:justify-between',
      )}
    >
      <div className="min-w-0">
        <div className="text-body font-medium text-fg-primary">{label}</div>
        {hint === undefined ? null : (
          <p className="mt-0.5 max-w-prose text-caption leading-relaxed text-fg-muted">{hint}</p>
        )}
      </div>
      {children === undefined ? null : (
        <div className={cn('flex items-center gap-2', stack ? '' : 'shrink-0')}>{children}</div>
      )}
    </div>
  );
}

export function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}): JSX.Element {
  // A label wrapping the whole row makes the description clickable too, which
  // is a wide target for a toggle and costs nothing.
  return (
    <label className="block cursor-pointer">
      <Row label={label} {...(hint === undefined ? {} : { hint })}>
        <Switch
          // Named explicitly: the wrapping label puts the hint in the
          // accessible name too, and "Stream responses <one long sentence>" is
          // not what a screen reader should read out for a switch.
          aria-label={label}
          checked={checked}
          disabled={disabled ?? false}
          onChange={(event) => onChange(event.target.checked)}
        />
      </Row>
    </label>
  );
}

export function SelectRow({
  label,
  hint,
  value,
  options,
  disabled,
  onChange,
  children,
}: {
  label: string;
  hint?: string;
  value: string;
  /** Simple `[value, label]` pairs; pass `children` instead for grouped or annotated options. */
  options?: readonly (readonly [string, string])[];
  disabled?: boolean;
  onChange: (value: string) => void;
  children?: ReactNode;
}): JSX.Element {
  return (
    <Row label={label} {...(hint === undefined ? {} : { hint })}>
      <Select
        className="min-w-[9rem]"
        value={value}
        disabled={disabled ?? false}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      >
        {children ??
          options?.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          ))}
      </Select>
    </Row>
  );
}

export function NumberRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  suffix,
  onCommit,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  /** Fired on blur, not per keystroke: a half-typed "2" is not a saved value. */
  onCommit: (value: number) => void;
}): JSX.Element {
  return (
    <Row label={label} {...(hint === undefined ? {} : { hint })}>
      <input
        type="number"
        aria-label={label}
        className={cn(
          'h-8 w-24 rounded-control border border-border bg-surface px-2.5 text-right',
          'text-caption font-medium tabular-nums text-fg-primary',
          'transition-colors duration-fast ease-calm hover:bg-surface-hover',
          'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        )}
        min={min}
        max={max}
        step={step ?? 1}
        defaultValue={value}
        key={value}
        onBlur={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && next !== value) onCommit(next);
        }}
      />
      {suffix === undefined ? null : <span className="text-caption text-fg-muted">{suffix}</span>}
    </Row>
  );
}

/** Shows a mutation's outcome without every page hand-rolling the same line. */
export function MutationStatus({
  error,
  success,
}: {
  error?: Error | null;
  success?: string | null;
}): JSX.Element | null {
  if (error) return <p className="px-4 pb-3 text-caption text-danger">{error.message}</p>;
  if (success) return <p className="px-4 pb-3 text-caption text-fg-muted">{success}</p>;
  return null;
}
