import { describe, it, expect } from 'vitest';
import { find } from '../src/index.js';

describe('find()', () => {
  it('finds a simple string in plain text', () => {
    const results = find('<p>Hello World</p>', 'World');
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('World');
    expect(results[0].start).toBe(6);
    expect(results[0].end).toBe(11);
  });

  it('finds text across tag boundaries', () => {
    const results = find('<p>Hel</p><p>lo</p>', 'Hello');
    expect(results).toHaveLength(1);
    expect(results[0].start).toBe(0);
    expect(results[0].text).toBe('Hello');
  });

  it('supports regex queries', () => {
    const results = find('<p>The year is 2024</p>', /\d{4}/);
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('2024');
  });

  it('returns multiple matches', () => {
    const results = find('<p>cat and cat and cat</p>', 'cat');
    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r.text).toBe('cat');
    }
  });

  it('returns empty array when no matches', () => {
    const results = find('<p>Hello World</p>', 'xyz');
    expect(results).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(find('', 'test')).toEqual([]);
  });

  it('returns empty array for empty query', () => {
    expect(find('<p>Hello</p>', '')).toEqual([]);
  });

  it('finds text ignoring non-visible elements', () => {
    const html = '<style>.x{}</style><p>Hello</p>';
    const results = find(html, 'Hello');
    expect(results).toHaveLength(1);
    expect(results[0].start).toBe(0);
  });

  it('handles regex with global flag', () => {
    const results = find('<p>aaa bbb aaa</p>', /aaa/g);
    expect(results).toHaveLength(2);
  });

  it('handles special regex characters in string query', () => {
    const results = find('<p>Price is $10.00</p>', '$10.00');
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('$10.00');
  });
});
