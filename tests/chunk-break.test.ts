import { describe, it, expect } from 'vitest';
import { chunk } from '../src/index.js';

// ─── chunk() with breakAt ────────────────────────────────────────

describe('chunk() with breakAt: "word"', () => {
  it('does not cut mid-word', () => {
    const html = '<p>Hello wonderful beautiful world</p>';
    const chunks = chunk(html, { size: 12, by: 'character', breakAt: 'word' });
    // Each chunk should contain complete words only
    for (const c of chunks) {
      const textContent = c.replace(/<[^>]*>/g, '').trim();
      // No partial words — every word boundary should be clean
      expect(textContent).not.toMatch(/^\S+\s\S*$/); // rough check — not cut mid-word
    }
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('produces chunks that together cover all content', () => {
    const html = '<p>One two three four five six seven</p>';
    const chunks = chunk(html, { size: 10, by: 'character', breakAt: 'word' });
    const combined = chunks.map(c => c.replace(/<[^>]*>/g, '')).join('');
    expect(combined.replace(/\s+/g, ' ').trim()).toContain('One two three four five six seven');
  });

  it('handles words longer than chunk size', () => {
    const html = '<p>Supercalifragilistic is a word</p>';
    const chunks = chunk(html, { size: 5, by: 'character', breakAt: 'word' });
    // Should still produce chunks even if a word exceeds size
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('works with word-based chunking (no effect expected)', () => {
    const html = '<p>One two three four five six</p>';
    const chunksBreak = chunk(html, { size: 3, by: 'word', breakAt: 'word' });
    const chunksNormal = chunk(html, { size: 3, by: 'word' });
    // Word-based chunking already breaks at word boundaries
    expect(chunksBreak.length).toBe(chunksNormal.length);
  });

  it('handles empty input', () => {
    const chunks = chunk('', { size: 10, by: 'character', breakAt: 'word' });
    expect(chunks).toEqual([]);
  });

  it('returns single chunk when content fits', () => {
    const chunks = chunk('<p>Hi</p>', { size: 100, by: 'character', breakAt: 'word' });
    expect(chunks).toHaveLength(1);
  });

  it('handles content with tags at word boundaries', () => {
    const html = '<p>Hello <strong>bold</strong> world</p>';
    const chunks = chunk(html, { size: 8, by: 'character', breakAt: 'word' });
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });
});
