import { describe, it, expect } from 'vitest';
import { split, count, chunk } from '../src/index.js';

// ─── by: 'line' / 'l' ───────────────────────────────────────────

describe('count() with by: "line"', () => {
  it('counts paragraphs as lines', () => {
    const html = '<p>Line 1</p><p>Line 2</p><p>Line 3</p>';
    expect(count(html, { by: 'line' })).toBe(3);
  });

  it('counts <br> as a line break', () => {
    const html = '<p>Line 1<br>Line 2<br>Line 3</p>';
    expect(count(html, { by: 'line' })).toBe(3);
  });

  it('works with short alias "l"', () => {
    const html = '<p>Line 1</p><p>Line 2</p>';
    expect(count(html, { by: 'l' })).toBe(2);
  });

  it('counts mixed block elements', () => {
    const html = '<h1>Heading</h1><p>Paragraph</p><div>Division</div>';
    expect(count(html, { by: 'line' })).toBeGreaterThanOrEqual(3);
  });

  it('returns 0 for empty string', () => {
    expect(count('', { by: 'line' })).toBe(0);
  });
});

describe('split() with by: "line"', () => {
  it('keeps first 2 paragraphs', () => {
    const html = '<p>Line 1</p><p>Line 2</p><p>Line 3</p>';
    const result = split(html, { keep: 2, by: 'line' });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('Line 1');
    expect(result.html).toContain('Line 2');
    expect(result.html).not.toContain('Line 3');
  });

  it('returns full content when keep exceeds total lines', () => {
    const html = '<p>Line 1</p><p>Line 2</p>';
    const result = split(html, { keep: 10, by: 'line' });
    expect(result.truncated).toBe(false);
  });

  it('handles br-based lines', () => {
    const html = '<p>First<br>Second<br>Third</p>';
    const result = split(html, { keep: 2, by: 'line' });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('First');
    expect(result.html).toContain('Second');
    expect(result.html).not.toContain('Third');
  });

  it('works with "l" alias', () => {
    const html = '<p>A</p><p>B</p><p>C</p>';
    const result = split(html, { keep: 1, by: 'l' });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('A');
    expect(result.html).not.toContain('B');
  });
});

describe('chunk() with by: "line"', () => {
  it('chunks by line count', () => {
    const html = '<p>Line 1</p><p>Line 2</p><p>Line 3</p><p>Line 4</p>';
    const chunks = chunk(html, { size: 2, by: 'line' });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('returns single chunk when all lines fit', () => {
    const html = '<p>Line 1</p><p>Line 2</p>';
    const chunks = chunk(html, { size: 10, by: 'line' });
    expect(chunks).toHaveLength(1);
  });

  it('handles empty input', () => {
    const chunks = chunk('', { size: 2, by: 'line' });
    expect(chunks).toEqual([]);
  });
});
