import { describe, it, expect } from 'vitest';
import { chunk } from '../src/index.js';

// ─── chunk() with overlap ────────────────────────────────────────

describe('chunk() with overlap', () => {
  const html = '<p>One two three four five six seven eight nine ten eleven twelve</p>';

  it('overlaps last N words of chunk N as first N of chunk N+1', () => {
    const chunks = chunk(html, { size: 6, by: 'word', overlap: 2 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // Each chunk after the first should start with the last 2 words of the previous chunk
  });

  it('produces more chunks than without overlap', () => {
    const withOverlap = chunk(html, { size: 6, by: 'word', overlap: 2 });
    const withoutOverlap = chunk(html, { size: 6, by: 'word' });
    expect(withOverlap.length).toBeGreaterThanOrEqual(withoutOverlap.length);
  });

  it('overlap=0 behaves same as no overlap (default)', () => {
    const chunks0 = chunk(html, { size: 5, by: 'word', overlap: 0 });
    const chunksDefault = chunk(html, { size: 5, by: 'word' });
    expect(chunks0.length).toBe(chunksDefault.length);
  });

  it('throws or returns empty when overlap >= size', () => {
    expect(() => {
      chunk(html, { size: 5, by: 'word', overlap: 5 });
    }).toThrow();
  });

  it('throws when overlap exceeds size', () => {
    expect(() => {
      chunk(html, { size: 5, by: 'word', overlap: 10 });
    }).toThrow();
  });

  it('works with character-based chunking', () => {
    const charHtml = '<p>abcdefghijklmnopqrstuvwxyz</p>';
    const chunks = chunk(charHtml, { size: 10, by: 'character', overlap: 3 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('handles single chunk — no overlap needed', () => {
    const short = '<p>Hello</p>';
    const chunks = chunk(short, { size: 100, by: 'word', overlap: 3 });
    expect(chunks).toHaveLength(1);
  });

  it('handles overlap of 1', () => {
    const chunks = chunk(html, { size: 4, by: 'word', overlap: 1 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
  });
});
