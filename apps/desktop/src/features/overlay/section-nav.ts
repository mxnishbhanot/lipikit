/**
 * Where Tab lands next. `starts` holds the flat-list index of each section's
 * first row, so the current section is "the last start at or before the
 * highlight" and Tab is one step through that list, wrapping at both ends.
 *
 * Pure and separate from the palette because the arithmetic is the only part
 * of the keyboard handling that can be wrong in a way nobody notices: an
 * off-by-one just feels like Tab skipping a heading.
 */
export function nextSectionStart(starts: readonly number[], active: number, backwards: boolean): number {
  if (starts.length === 0) return active;
  const current = starts.filter((start) => start <= active).length - 1;
  const next = (current + (backwards ? -1 : 1) + starts.length) % starts.length;
  return starts[next] ?? 0;
}
