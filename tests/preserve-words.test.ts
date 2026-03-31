import { describe, it, expect } from 'vitest';
import { split } from '../src/index.js';

// ─── preserveWords enhancement ──────────────────────────────────

describe('split() with preserveWords: true (backward compatible)', () => {
  it('backtracks to last space boundary', () => {
    const result = split('<p>Hello wonderful world</p>', { keep: 8, by: 'character', preserveWords: true });
    expect(result.html).not.toContain('wond');
    expect(result.truncated).toBe(true);
  });

  it('keeps full word when cut lands at word boundary', () => {
    const result = split('<p>Hello world</p>', { keep: 5, by: 'character', preserveWords: true });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBeLessThanOrEqual(5);
  });

  it('handles single word longer than keep', () => {
    const result = split('<p>Supercalifragilistic</p>', { keep: 5, by: 'character', preserveWords: true });
    expect(result.truncated).toBe(true);
  });
});

describe('split() with preserveWords: "trim"', () => {
  it('behaves same as true — backtracks to last space', () => {
    const html = '<p>Hello wonderful world</p>';
    const resultTrue = split(html, { keep: 8, by: 'character', preserveWords: true });
    const resultTrim = split(html, { keep: 8, by: 'character', preserveWords: 'trim' });
    expect(resultTrim.html).toBe(resultTrue.html);
  });

  it('trims trailing whitespace before ellipsis', () => {
    const result = split('<p>Hello world again</p>', { keep: 6, by: 'character', preserveWords: 'trim' });
    expect(result.html).not.toMatch(/\s\.\.\./);
  });
});

describe('split() with preserveWords: number (scan-forward)', () => {
  it('scans forward up to N extra chars to finish word', () => {
    // "Hello wo" at keep=8, with preserveWords=15 should scan forward to finish "world"
    const result = split('<p>Hello world is great</p>', { keep: 8, by: 'character', preserveWords: 15 });
    expect(result.html).toContain('world');
    expect(result.truncated).toBe(true);
  });

  it('does not exceed the scan-forward limit', () => {
    // "Hello su" at keep=8, with preserveWords=2 — only 2 extra chars allowed, not enough to finish "supercalifragilistic"
    const result = split('<p>Hello supercalifragilistic</p>', { keep: 8, by: 'character', preserveWords: 2 });
    expect(result.html).not.toContain('supercalifragilistic');
    expect(result.truncated).toBe(true);
  });

  it('finishes word exactly at boundary when within limit', () => {
    // "Hello wor" at keep=9, with preserveWords=3 — need 2 more chars for "world", within limit
    const result = split('<p>Hello world</p>', { keep: 9, by: 'character', preserveWords: 3 });
    expect(result.html).toContain('world');
  });
});

describe('preserveWords edge cases', () => {
  it('only applies to by=character mode', () => {
    const result = split('<p>One two three four</p>', { keep: 2, by: 'word', preserveWords: true });
    // Word mode already preserves words, so preserveWords shouldn't affect it
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(2);
  });

  it('returns full content when keep exceeds total', () => {
    const result = split('<p>Hi</p>', { keep: 100, by: 'character', preserveWords: true });
    expect(result.truncated).toBe(false);
  });

  it('handles empty string', () => {
    const result = split('', { keep: 5, by: 'character', preserveWords: true });
    expect(result.html).toBe('');
    expect(result.truncated).toBe(false);
  });
});
