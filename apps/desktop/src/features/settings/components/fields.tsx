import type { ReactNode } from 'react';

/** One control class shared by every settings input, so pages stay declarative. */
export const FIELD =
  'w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description === undefined ? null : <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  );
}

/**
 * A label wrapping its control, so the whole row is the hit target. `hint`
 * sits under the control rather than in the label column, which keeps the
 * two-column grid from stretching for one long explanation.
 */
export function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div>
      <label className="grid grid-cols-[12rem_1fr] items-center gap-3">
        <span className="text-muted-foreground">{label}</span>
        {children}
      </label>
      {hint === undefined ? null : <p className="mt-1 pl-[12.75rem] text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Toggle({
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
  return (
    <Row label={label} {...(hint === undefined ? {} : { hint })}>
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={checked}
        disabled={disabled ?? false}
        onChange={(event) => onChange(event.target.checked)}
      />
    </Row>
  );
}

export function NumberField({
  label,
  hint,
  value,
  min,
  max,
  step,
  onCommit,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Fired on blur, not per keystroke: a half-typed "2" is not a saved value. */
  onCommit: (value: number) => void;
}): JSX.Element {
  return (
    <Row label={label} {...(hint === undefined ? {} : { hint })}>
      <input
        type="number"
        className={FIELD}
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
  if (error) return <p className="text-xs text-destructive">{error.message}</p>;
  if (success) return <p className="text-xs text-muted-foreground">{success}</p>;
  return null;
}
