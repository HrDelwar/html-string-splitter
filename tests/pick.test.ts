import { describe, it, expect } from 'vitest';
import { pick } from '../src/index.js';

// ─── pick() by text ─────────────────────────────────────────────

describe('pick() by text', () => {
  it('finds simple text match with HTML slice', () => {
    const results = pick('<p>Hello <strong>world</strong></p>', { text: 'world' });
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('world');
    expect(results[0].html).toContain('world');
    expect(results[0].start).toBe(6);
    expect(results[0].end).toBe(11);
  });

  it('finds multiple matches', () => {
    const results = pick('<p>cat and dog and cat</p>', { text: 'cat' });
    expect(results).toHaveLength(2);
    expect(results[0].text).toBe('cat');
    expect(results[1].text).toBe('cat');
    expect(results[0].start).toBe(0);
  });

  it('finds regex matches', () => {
    const results = pick('<p>Price $19.99 and $29.99</p>', { text: /\$\d+\.\d+/g });
    expect(results).toHaveLength(2);
    expect(results[0].text).toBe('$19.99');
    expect(results[1].text).toBe('$29.99');
  });

  it('returns empty for no matches', () => {
    expect(pick('<p>Hello</p>', { text: 'xyz' })).toHaveLength(0);
  });

  it('respects limit', () => {
    const results = pick('<p>a b a b a</p>', { text: 'a', limit: 2 });
    expect(results).toHaveLength(2);
  });

  it('returns empty for empty input', () => {
    expect(pick('', { text: 'hello' })).toHaveLength(0);
  });

  it('handles special regex characters in string query', () => {
    const results = pick('<p>Price is $10.00</p>', { text: '$10.00' });
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('$10.00');
  });
});

// ─── pick() by tag ──────────────────────────────────────────────

describe('pick() by tag', () => {
  it('picks list items', () => {
    const results = pick('<ul><li>Apple</li><li>Banana</li><li>Cherry</li></ul>', { tag: 'li' });
    expect(results).toHaveLength(3);
    expect(results[0].html).toBe('<li>Apple</li>');
    expect(results[0].text).toBe('Apple');
    expect(results[0].start).toBe(0);
    expect(results[0].end).toBe(1);
    expect(results[1].text).toBe('Banana');
    expect(results[2].text).toBe('Cherry');
  });

  it('picks self-closing tags', () => {
    const results = pick('<p>Text <img src="a.png"> more <img src="b.png"></p>', { tag: 'img' });
    expect(results).toHaveLength(2);
    expect(results[0].html).toContain('a.png');
    expect(results[0].text).toBe('');
    expect(results[1].html).toContain('b.png');
  });

  it('picks tags with nested content', () => {
    const results = pick('<div><p>Hello <strong>world</strong></p><p>Second</p></div>', { tag: 'p' });
    expect(results).toHaveLength(2);
    expect(results[0].html).toBe('<p>Hello <strong>world</strong></p>');
    expect(results[0].text).toBe('Hello world');
    expect(results[1].html).toBe('<p>Second</p>');
  });

  it('respects limit', () => {
    const results = pick('<ul><li>A</li><li>B</li><li>C</li></ul>', { tag: 'li', limit: 2 });
    expect(results).toHaveLength(2);
    expect(results[0].text).toBe('A');
    expect(results[1].text).toBe('B');
  });

  it('returns empty when tag not found', () => {
    expect(pick('<p>Hello</p>', { tag: 'li' })).toHaveLength(0);
  });

  it('returns empty for no options', () => {
    expect(pick('<p>Hello</p>', {})).toHaveLength(0);
  });
});
