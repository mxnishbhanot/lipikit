import type { WindowBounds } from '@ai-anywhere/shared';

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/**
 * Fit saved geometry back onto the display it lands on. Stored bounds outlive
 * the layout they were saved in: undocking a laptop, unplugging the second
 * monitor or changing resolution all leave coordinates that no display covers
 * any more, and handing those to setBounds reopens the window off screen
 * where the user cannot drag it back.
 *
 * `workArea` is the target display's work area (the screen minus the taskbar
 * or dock), so the restored window never sits under the panel either.
 */
export function fitToWorkArea(bounds: WindowBounds, workArea: WindowBounds): WindowBounds {
  const width = Math.min(bounds.width, workArea.width);
  const height = Math.min(bounds.height, workArea.height);
  return {
    width,
    height,
    x: clamp(bounds.x, workArea.x, workArea.x + workArea.width - width),
    y: clamp(bounds.y, workArea.y, workArea.y + workArea.height - height),
  };
}
