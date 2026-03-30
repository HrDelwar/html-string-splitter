import { describe, it, expect } from 'vitest';
import { splitAt } from '../src/index.js';

// ─── splitAt() ────────────────────────────────────────────────────

describe('splitAt()', () => {
  it('splits into two parts at character position', () => {
    const [before, after] = splitAt('<p>Hello world</p>', { at: 5, by: 'c' });
    expect(before).toContain('Hello');
    expect(after).toContain('world');
  });

  it('splits by word', () => {
    const [before, after] = splitAt('<p>One two three four</p>', { at: 2, by: 'w' });
    expect(before).toContain('One');
    expect(before).toContain('two');
    expect(after).toContain('three');
  });

  it('returns [full, empty] when at >= total', () => {
    const [before, after] = splitAt('<p>Hello</p>', { at: 100, by: 'c' });
    expect(before).toBe('<p>Hello</p>');
    expect(after).toBe('');
  });

  it('returns [empty, full] when at is 0', () => {
    const [before, after] = splitAt('<p>Hello</p>', { at: 0, by: 'c' });
    expect(before).toBe('');
    expect(after).toContain('Hello');
  });

  it('produces balanced tags in both halves', () => {
    const [before, after] = splitAt('<div><p>Hello world</p></div>', { at: 5, by: 'c' });
    expect(before).toContain('</p>');
    expect(before).toContain('</div>');
    expect(after).toContain('<div>');
    expect(after).toContain('<p>');
  });

  it('handles invalid input', () => {
    expect(splitAt('', { at: 5 })).toEqual(['', '']);
    expect(splitAt(null as any, { at: 5 })).toEqual(['', '']);
  });

  it('handles invalid at value', () => {
    const [before, after] = splitAt('<p>Hello</p>', { at: -1 });
    expect(before).toBe('');
    expect(after).toContain('Hello');
  });

  it('preserves entities', () => {
    const [before, after] = splitAt('<p>A &amp; B &amp; C</p>', { at: 3, by: 'c' });
    expect(before).toContain('&amp;');
  });
});
