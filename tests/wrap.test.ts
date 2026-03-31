import { describe, it, expect } from 'vitest';
import { wrap } from '../src/index.js';

describe('wrap()', () => {
  it('wraps every N characters in a span', () => {
    const result = wrap('Hello World', { every: 5, by: 'c' });
    expect(result).toContain('<span>');
    expect(result).toContain('</span>');
  });

  it('uses custom tag name', () => {
    const result = wrap('Hello World', { every: 5, by: 'c', tag: 'div' });
    expect(result).toContain('<div>');
    expect(result).toContain('</div>');
    expect(result).not.toContain('<span>');
  });

  it('uses custom className', () => {
    const result = wrap('Hello World', { every: 5, by: 'c', className: 'chunk' });
    expect(result).toContain('class="chunk"');
  });

  it('returns empty string for empty input', () => {
    expect(wrap('', { every: 5, by: 'c' })).toBe('');
  });

  it('returns original html for invalid every value', () => {
    expect(wrap('Hello', { every: 0, by: 'c' })).toBe('Hello');
    expect(wrap('Hello', { every: -1, by: 'c' })).toBe('Hello');
  });

  it('produces balanced HTML output', () => {
    const result = wrap('<p>Hello World</p>', { every: 3, by: 'c' });
    const openSpans = (result.match(/<span>/g) || []).length;
    const closeSpans = (result.match(/<\/span>/g) || []).length;
    expect(openSpans).toBe(closeSpans);
  });

  it('preserves inner HTML tags', () => {
    const result = wrap('<p><strong>Bold</strong> text</p>', { every: 10, by: 'c' });
    expect(result).toContain('<strong>');
    expect(result).toContain('</strong>');
    expect(result).toContain('<p>');
  });

  it('supports custom attributes', () => {
    const result = wrap('Hello', { every: 5, by: 'c', attributes: { 'data-idx': '0' } });
    expect(result).toContain('data-idx="0"');
  });

  it('wraps short text in a single wrapper', () => {
    const result = wrap('Hi', { every: 10, by: 'c' });
    const openSpans = (result.match(/<span>/g) || []).length;
    expect(openSpans).toBe(1);
  });
});
