import { describe, it, expect } from 'vitest';
import { chunk } from '../src/index.js';

// ─── chunk() ──────────────────────────────────────────────────────

describe('chunk()', () => {
  it('splits into multiple chunks by word', () => {
    const html = '<p>One two three four five six</p>';
    const chunks = chunk(html, { size: 3, by: 'word' });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array for empty input', () => {
    expect(chunk('', { size: 5 })).toEqual([]);
  });

  it('returns empty array for invalid size', () => {
    expect(chunk('<p>Hello</p>', { size: 0 })).toEqual([]);
    expect(chunk('<p>Hello</p>', { size: -1 })).toEqual([]);
  });

  it('returns single chunk when content fits', () => {
    const chunks = chunk('<p>Hi</p>', { size: 100, by: 'character' });
    expect(chunks).toHaveLength(1);
  });
});
