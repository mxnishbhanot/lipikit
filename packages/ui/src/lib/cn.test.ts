import { describe, expect, it } from 'vitest';
import { cn } from './cn.js';

describe('cn', () => {
  it('keeps a text colour when a custom type size follows it', () => {
    expect(cn('text-accent-foreground', 'text-caption')).toBe('text-accent-foreground text-caption');
  });

  it('still lets one type size replace another', () => {
    expect(cn('text-body', 'text-hero')).toBe('text-hero');
  });

  it('still lets one text colour replace another', () => {
    expect(cn('text-fg-muted', 'text-fg-primary')).toBe('text-fg-primary');
  });
});
