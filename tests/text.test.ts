import { describe, it, expect } from 'vitest';
import { text } from '../src/index.js';

// ─── text() ───────────────────────────────────────────────────────

describe('text()', () => {
  it('extracts plain text from HTML', () => {
    expect(text('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('decodes entities', () => {
    expect(text('<p>A &amp; B &lt; C</p>')).toBe('A & B < C');
  });

  it('excludes style/script/head content', () => {
    expect(text('<head><title>T</title></head><body><p>Hello</p></body>')).toBe('Hello');
    expect(text('<style>.x{}</style><p>Hi</p>')).toBe('Hi');
    expect(text('<script>var x</script><p>Hi</p>')).toBe('Hi');
  });

  it('returns empty string for invalid input', () => {
    expect(text('')).toBe('');
    expect(text(null as any)).toBe('');
  });

  it('handles plain text without tags', () => {
    expect(text('Hello world')).toBe('Hello world');
  });

  it('separates block elements with space', () => {
    expect(text('<h1>Title</h1><p>Body</p>', { separator: ' ' })).toBe('Title Body');
  });

  it('separates block elements with newline', () => {
    expect(text('<h1>Title</h1><p>Body</p>', { separator: '\n' })).toBe('Title\nBody');
  });

  it('separates list items', () => {
    expect(text('<ul><li>A</li><li>B</li><li>C</li></ul>', { separator: ' ' })).toBe('A B C');
  });

  it('does not separate inline elements', () => {
    expect(text('<p>Hello <strong>bold</strong> world</p>', { separator: ' ' })).toBe('Hello bold world');
  });

  it('separates br tags', () => {
    expect(text('<p>Line1<br>Line2</p>', { separator: ' ' })).toBe('Line1 Line2');
  });

  it('separates table cells', () => {
    expect(text('<table><tr><td>A</td><td>B</td></tr></table>', { separator: ' ' })).toBe('A B');
  });

  it('no double separators', () => {
    expect(text('<div><p>Hello</p></div><div><p>World</p></div>', { separator: ' ' })).not.toContain('  ');
  });

  it('no separator without option', () => {
    expect(text('<h1>Title</h1><p>Body</p>')).toBe('TitleBody');
  });
});
