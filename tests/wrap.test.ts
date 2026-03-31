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

  it('no empty trailing wrapper when content fits exactly', () => {
    const result = wrap('Hello', { every: 5, by: 'c', tag: 'section' });
    expect(result).toBe('<section>Hello</section>');
  });
});

describe('wrap() by tag', () => {
  it('wraps list items in groups', () => {
    const result = wrap('<li>A</li><li>B</li><li>C</li><li>D</li><li>E</li>', { every: 2, by: 'li', tag: 'ul' });
    expect(result).toBe('<ul><li>A</li><li>B</li></ul><ul><li>C</li><li>D</li></ul><ul><li>E</li></ul>');
  });

  it('wraps self-closing tags', () => {
    const result = wrap('<img src="1"><img src="2"><img src="3">', { every: 2, by: 'img', tag: 'div' });
    expect(result).toBe('<div><img src="1"><img src="2"></div><div><img src="3"></div>');
  });

  it('wraps paragraphs into sections', () => {
    const result = wrap('<p>First</p><p>Second</p><p>Third</p><p>Fourth</p>', { every: 2, by: 'p', tag: 'section' });
    expect(result).toBe('<section><p>First</p><p>Second</p></section><section><p>Third</p><p>Fourth</p></section>');
  });

  it('supports className and attributes in tag mode', () => {
    const result = wrap('<li>A</li><li>B</li><li>C</li>', { every: 2, by: 'li', tag: 'ul', className: 'page', attributes: { role: 'list' } });
    expect(result).toContain('class="page"');
    expect(result).toContain('role="list"');
    const opens = (result.match(/<ul/g) || []).length;
    expect(opens).toBe(2);
  });

  it('single group when fewer than every', () => {
    const result = wrap('<li>A</li><li>B</li>', { every: 5, by: 'li', tag: 'ul' });
    expect(result).toBe('<ul><li>A</li><li>B</li></ul>');
  });

  it('preserves content between target tags', () => {
    const result = wrap('<p>A</p>text<p>B</p><p>C</p>', { every: 2, by: 'p', tag: 'div' });
    expect(result).toContain('text');
    expect(result).toContain('<p>A</p>');
  });
});
