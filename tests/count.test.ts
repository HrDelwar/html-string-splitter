import { describe, it, expect } from 'vitest';
import { count } from '../src/index.js';

// ─── count() ──────────────────────────────────────────────────────

describe('count()', () => {
  const html = '<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>';

  it('counts characters', () => {
    const result = count(html, { by: 'character' });
    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });

  it('counts words', () => {
    const result = count(html, { by: 'word' });
    expect(result).toBe(10);
  });

  it('counts characters with entities', () => {
    expect(count('<p>A &amp; B</p>', { by: 'character' })).toBe(5);
  });

  it('counts emoji as single characters', () => {
    expect(count('<p>Hi 😀</p>', { by: 'character' })).toBe(4);
  });

  it('returns 0 for empty/invalid input', () => {
    expect(count('')).toBe(0);
    expect(count(null as any)).toBe(0);
    expect(count(undefined as any)).toBe(0);
  });

  it('defaults to character counting', () => {
    expect(count('<p>Hello</p>')).toBe(5);
  });

  it('counts sentences', () => {
    expect(count('<p>First. Second. Third.</p>', { by: 'sentence' })).toBe(3);
  });
});
