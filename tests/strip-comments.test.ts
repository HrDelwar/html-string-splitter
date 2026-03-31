import { describe, it, expect } from 'vitest';
import { split } from '../src/index.js';

describe('split() with stripComments', () => {
  it('preserves comments by default', () => {
    const html = '<p>Hello <!-- comment --> World</p>';
    const result = split(html, { keep: 100, by: 'c' });
    expect(result.html).toContain('<!-- comment -->');
  });

  it('removes comments when stripComments is true and truncating', () => {
    const html = '<p>Hello <!-- comment --> World</p>';
    const result = split(html, { keep: 8, by: 'c', stripComments: true });
    expect(result.html).not.toContain('<!-- comment -->');
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('Hello');
  });

  it('removes multiple comments during truncation', () => {
    const html = '<!-- first --><p>Text</p><!-- second --><p>More</p><!-- third -->';
    const result = split(html, { keep: 4, by: 'c', stripComments: true });
    expect(result.html).not.toContain('<!-- first -->');
    expect(result.html).not.toContain('<!-- second -->');
    expect(result.html).toContain('Text');
  });

  it('returns original html when not truncated (keep >= total)', () => {
    // stripComments removes comments even when not truncated
    const html = '<p>Hello <!-- comment --> World</p>';
    const result = split(html, { keep: 100, by: 'c', stripComments: true });
    expect(result.truncated).toBe(false);
    expect(result.html).not.toContain('<!--');
    expect(result.html).toContain('Hello');
    expect(result.html).toContain('World');
  });

  it('strips comments while truncating', () => {
    const html = '<p>Hello<!-- hidden --> World</p>';
    const result = split(html, { keep: 5, by: 'c', stripComments: true });
    expect(result.html).not.toContain('<!-- hidden -->');
    expect(result.truncated).toBe(true);
  });

  it('preserves comments when stripComments is false', () => {
    const html = '<p><!-- keep me -->Text</p>';
    const result = split(html, { keep: 100, by: 'c', stripComments: false });
    expect(result.html).toContain('<!-- keep me -->');
  });

  it('handles HTML with no comments and stripComments true', () => {
    const html = '<p>No comments here</p>';
    const result = split(html, { keep: 100, by: 'c', stripComments: true });
    expect(result.html).toBe(html);
  });
});
