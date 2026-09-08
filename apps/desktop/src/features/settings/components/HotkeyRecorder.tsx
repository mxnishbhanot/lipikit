import { useState } from 'react';
import { Button } from '@ai-anywhere/ui';

/** Electron accelerator modifier names, in the order Electron prints them. */
const modifiers = (event: KeyboardEvent | React.KeyboardEvent): string[] => [
  ...(event.ctrlKey ? ['Control'] : []),
  ...(event.altKey ? ['Alt'] : []),
  ...(event.shiftKey ? ['Shift'] : []),
  ...(event.metaKey ? ['Super'] : []),
];

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'OS']);

/**
 * `event.key` is layout-dependent ("ù" on an AZERTY keyboard); `event.code`
 * is physical and matches what Electron registers, so the accelerator built
 * here is the one the OS will actually honour.
 */
const keyName = (code: string, key: string): string | null => {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F\d{1,2}$/.test(code)) return code;
  const named: Record<string, string> = {
    Space: 'Space',
    Enter: 'Return',
    Tab: 'Tab',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    Backslash: '\\',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Insert: 'Insert',
    Delete: 'Delete',
  };
  return named[code] ?? (key.length === 1 ? key.toUpperCase() : null);
};

export function HotkeyRecorder({
  value,
  disabled,
  onChange,
  onClear,
}: {
  value: string;
  disabled?: boolean;
  onChange: (accelerator: string) => void;
  /** Omitted for a shortcut that cannot be removed, which hides the button. */
  onClear?: () => void;
}): JSX.Element {
  const [recording, setRecording] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {recording ? (
        <input
          autoFocus
          readOnly
          value="Press a combination…"
          aria-label="Press the new shortcut"
          className="w-56 rounded-md border border-ring bg-background px-2 py-1 text-sm outline-none"
          onBlur={() => setRecording(false)}
          onKeyDown={(event) => {
            event.preventDefault();
            if (event.key === 'Escape') {
              setRecording(false);
              return;
            }
            // A bare letter would register a global shortcut that swallows
            // that key everywhere, so at least one modifier is required.
            if (MODIFIER_KEYS.has(event.key)) return;
            const parts = modifiers(event);
            const main = keyName(event.code, event.key);
            if (parts.length === 0 || main === null) return;
            setRecording(false);
            onChange([...parts, main].join('+'));
          }}
        />
      ) : (
        <code className="w-56 rounded bg-muted px-2 py-1 text-sm">
          {value.length > 0 ? value : <span className="text-muted-foreground">Not set</span>}
        </code>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={disabled ?? false}
        onClick={() => setRecording((previous) => !previous)}
      >
        {recording ? 'Cancel' : value.length > 0 ? 'Change' : 'Set'}
      </Button>
      {onClear !== undefined && value.length > 0 && !recording ? (
        <Button size="sm" variant="ghost" disabled={disabled ?? false} onClick={onClear}>
          Remove
        </Button>
      ) : null}
    </div>
  );
}
