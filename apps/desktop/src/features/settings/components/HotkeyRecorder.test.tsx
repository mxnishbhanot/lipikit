import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, test } from 'vitest';
import { HotkeyRecorder } from './HotkeyRecorder.js';

// RTL only auto-cleans when vitest runs with globals; this project does not.
afterEach(cleanup);

/**
 * The recorder is the one place where a wrong accelerator silently registers a
 * global shortcut that swallows a key everywhere, so the rules it enforces —
 * a modifier is mandatory, `event.code` wins over the layout-dependent
 * `event.key` — are worth a test rather than a manual check.
 */
const startRecording = (onChange: (accelerator: string) => void): HTMLElement => {
  render(<HotkeyRecorder value="Control+Space" onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Change' }));
  return screen.getByLabelText('Press the new shortcut');
};

test('builds an Electron accelerator from the physical key code', () => {
  const recorded: string[] = [];
  const input = startRecording((accelerator) => recorded.push(accelerator));

  // AZERTY: the letter printed on the key is not the letter Electron registers.
  fireEvent.keyDown(input, { code: 'KeyA', key: 'ù', ctrlKey: true, shiftKey: true });

  assert.deepEqual(recorded, ['Control+Shift+A']);
  // Recording stops on a successful capture, so the value is shown again.
  assert.ok(screen.getByText('Control+Space'));
});

test('refuses a combination with no modifier and ignores bare modifier presses', () => {
  const recorded: string[] = [];
  const input = startRecording((accelerator) => recorded.push(accelerator));

  fireEvent.keyDown(input, { code: 'KeyA', key: 'a' });
  fireEvent.keyDown(input, { code: 'ControlLeft', key: 'Control', ctrlKey: true });

  assert.deepEqual(recorded, []);
  // Still recording: neither press was a usable accelerator.
  assert.ok(screen.getByLabelText('Press the new shortcut'));
});

test('Escape cancels without reporting a change', () => {
  const recorded: string[] = [];
  const input = startRecording((accelerator) => recorded.push(accelerator));

  fireEvent.keyDown(input, { code: 'Escape', key: 'Escape' });

  assert.deepEqual(recorded, []);
  assert.ok(screen.getByText('Control+Space'));
});
