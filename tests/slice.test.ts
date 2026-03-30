import { describe, it, expect } from 'vitest';
import { slice } from '../src/index.js';

// ─── slice() ──────────────────────────────────────────────────────

describe('slice()', () => {
  it('extracts a range by character', () => {
    const result = slice('<p>Hello world</p>', { start: 6, end: 11, by: 'c' });
    expect(result).toContain('world');
  });

  it('extracts a range by word', () => {
    const result = slice('<p>One two three four five</p>', { start: 1, end: 3, by: 'w' });
    expect(result).toContain('two');
    expect(result).toContain('three');
  });

  it('defaults start to 0', () => {
    const result = slice('<p>Hello world</p>', { end: 5, by: 'c' });
    expect(result).toContain('Hello');
  });

  it('defaults end to total', () => {
    const result = slice('<p>Hello world</p>', { start: 6, by: 'c' });
    expect(result).toContain('world');
  });

  it('supports negative start', () => {
    const result = slice('<p>Hello world</p>', { start: -5, by: 'c' });
    expect(result).toContain('world');
  });

  it('supports negative end', () => {
    const result = slice('<p>Hello world</p>', { start: 0, end: -6, by: 'c' });
    expect(result).toContain('Hello');
  });

  it('returns empty for start >= end', () => {
    expect(slice('<p>Hello</p>', { start: 5, end: 3, by: 'c' })).toBe('');
  });

  it('returns empty for start >= total', () => {
    expect(slice('<p>Hello</p>', { start: 100, by: 'c' })).toBe('');
  });

  it('clamps end to total', () => {
    const result = slice('<p>Hello</p>', { start: 0, end: 999, by: 'c' });
    expect(result).toContain('Hello');
  });

  it('returns empty for invalid input', () => {
    expect(slice('')).toBe('');
    expect(slice(null as any)).toBe('');
  });

  it('produces valid HTML with balanced tags', () => {
    const result = slice('<div><p>Hello world</p></div>', { start: 6, end: 11, by: 'c' });
    expect(result).toContain('<div>');
    expect(result).toContain('</div>');
    expect(result).toContain('world');
  });
});
