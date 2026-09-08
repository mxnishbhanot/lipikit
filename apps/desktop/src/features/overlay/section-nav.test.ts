import { describe, expect, it } from 'vitest';
import { nextSectionStart } from './section-nav.js';

// Three sections: rows 0-1, rows 2-4, rows 5-5.
const STARTS = [0, 2, 5];

describe('nextSectionStart', () => {
  it('jumps to the next section from anywhere inside one', () => {
    expect(nextSectionStart(STARTS, 0, false)).toBe(2);
    expect(nextSectionStart(STARTS, 1, false)).toBe(2);
    expect(nextSectionStart(STARTS, 3, false)).toBe(5);
  });

  it('wraps at both ends', () => {
    expect(nextSectionStart(STARTS, 5, false)).toBe(0);
    expect(nextSectionStart(STARTS, 0, true)).toBe(5);
  });

  it('goes to the start of the previous section, not the previous row', () => {
    expect(nextSectionStart(STARTS, 4, true)).toBe(0);
  });

  it('stays put when there are no sections', () => {
    expect(nextSectionStart([], 3, false)).toBe(3);
  });
});
