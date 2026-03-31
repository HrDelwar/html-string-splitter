import { describe, it, expect } from 'vitest';
import { highlight } from '../src/index.js';

describe('highlight()', () => {
  it('wraps matches in <mark> by default', () => {
    const result = highlight('<p>Hello world</p>', 'world');
    expect(result).toBe('<p>Hello <mark>world</mark></p>');
  });

  it('wraps multiple matches', () => {
    const result = highlight('<p>Hello world, hello again</p>', 'hello');
    expect(result).toContain('<mark>Hello</mark>');
    expect(result).toContain('<mark>hello</mark>');
  });

  it('uses custom tag', () => {
    const result = highlight('<p>Hello world</p>', 'world', { tag: 'span' });
    expect(result).toBe('<p>Hello <span>world</span></p>');
  });

  it('uses custom className', () => {
    const result = highlight('<p>Hello world</p>', 'world', { tag: 'span', className: 'found' });
    expect(result).toContain('<span class="found">world</span>');
  });

  it('uses custom attributes', () => {
    const result = highlight('<p>Hello world</p>', 'world', { tag: 'span', attributes: { 'data-match': 'true' } });
    expect(result).toContain('data-match="true"');
  });

  it('handles regex', () => {
    const result = highlight('<p>Price $19.99 and $29.99</p>', /\$\d+\.\d+/g);
    expect(result).toContain('<mark>$19.99</mark>');
    expect(result).toContain('<mark>$29.99</mark>');
  });

  it('returns original html when no matches', () => {
    const html = '<p>Hello world</p>';
    expect(highlight(html, 'xyz')).toBe(html);
  });

  it('returns empty string for empty input', () => {
    expect(highlight('', 'hello')).toBe('');
  });
});
