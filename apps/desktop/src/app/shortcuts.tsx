import { useEffect, useRef, useState } from 'react';
import { Kbd } from '@ai-anywhere/ui';
import { SHORTCUTS, SHORTCUT_SHEET_EVENT, isHelpKey, type ShortcutScope } from './shortcut-keys.js';

/**
 * The cheatsheet itself, with no chrome of its own: the settings window puts it
 * in a modal dialog, and the popup swaps it in as a body so its auto-height
 * window can grow around it.
 */
export function ShortcutList({ scope }: { readonly scope: ShortcutScope }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {SHORTCUTS[scope].map((group) => (
        <section key={group.title}>
          <h3 className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
            {group.title}
          </h3>
          <dl className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {group.items.map((item) => (
              <div key={`${item.keys} ${item.what}`} className="flex items-center gap-3 px-3 py-2">
                <dt className="flex shrink-0 items-center gap-1">
                  {item.keys.split(' / ').map((combo, index) => (
                    <span key={combo} className="flex items-center gap-1">
                      {index === 0 ? null : <span className="text-caption text-fg-muted">or</span>}
                      <Kbd combo={combo} />
                    </span>
                  ))}
                </dt>
                <dd className="min-w-0 flex-1 text-right text-caption text-fg-secondary">{item.what}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/**
 * Native `<dialog>`: the platform already owns the focus trap, the backdrop,
 * the inert background and Escape-to-close, so none of that is written here.
 * It listens for its own key gesture and for the `shortcut-sheet` event, which
 * is how the command palette opens it without either component holding the
 * other's state.
 */
export function ShortcutDialog(): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = (): void => setOpen(true);
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!isHelpKey(event)) return;
      event.preventDefault();
      setOpen((current) => !current);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(SHORTCUT_SHEET_EVENT, show);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(SHORTCUT_SHEET_EVENT, show);
    };
  }, []);

  // showModal/close are imperative, so the state above is the source of truth
  // and this effect only mirrors it onto the element.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Keyboard shortcuts"
      onClose={() => setOpen(false)}
      className="w-[min(32rem,92vw)] rounded-popup border border-border bg-background p-5 text-fg-primary shadow-popup"
    >
      <h2 className="pb-3 text-body-lg font-semibold">Keyboard shortcuts</h2>
      <ShortcutList scope="main" />
    </dialog>
  );
}
