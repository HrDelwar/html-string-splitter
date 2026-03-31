import { describe, it, expect } from 'vitest';
import { split } from '../src/index.js';

// ─── selectiveTags ───────────────────────────────────────────────

describe('split() with stripTags and selectiveTags', () => {
  const html = '<p>Hello <span class="hl">beautiful</span> <strong>world</strong></p>';

  it('only strips specified tags, keeps others', () => {
    const result = split(html, { keep: 100, by: 'character', stripTags: true, selectiveTags: ['span'] });
    expect(result.html).not.toContain('<span');
    expect(result.html).not.toContain('</span>');
    expect(result.html).toContain('<p>');
    expect(result.html).toContain('<strong>');
    expect(result.html).toContain('beautiful');
  });

  it('strips all tags when stripTags:true without selectiveTags', () => {
    const result = split(html, { keep: 100, by: 'character', stripTags: true });
    expect(result.html).not.toContain('<p>');
    expect(result.html).not.toContain('<span');
    expect(result.html).not.toContain('<strong>');
    expect(result.html).toContain('Hello');
    expect(result.html).toContain('beautiful');
    expect(result.html).toContain('world');
  });

  it('strips multiple specified tags', () => {
    const result = split(html, { keep: 100, by: 'character', stripTags: true, selectiveTags: ['span', 'strong'] });
    expect(result.html).not.toContain('<span');
    expect(result.html).not.toContain('<strong>');
    expect(result.html).toContain('<p>');
    expect(result.html).toContain('Hello');
  });

  it('does nothing when selectiveTags is set but stripTags is false', () => {
    const result = split(html, { keep: 100, by: 'character', selectiveTags: ['span'] });
    // selectiveTags without stripTags should have no effect
    expect(result.html).toContain('<span');
    expect(result.html).toContain('<strong>');
  });

  it('handles nested tags selectively', () => {
    const nested = '<div><p>Text <em><span>inner</span></em></p></div>';
    const result = split(nested, { keep: 100, by: 'character', stripTags: true, selectiveTags: ['span'] });
    expect(result.html).not.toContain('<span');
    expect(result.html).toContain('<div>');
    expect(result.html).toContain('<em>');
    expect(result.html).toContain('inner');
  });

  it('preserves self-closing tags not in selectiveTags', () => {
    const withBr = '<p>Line one<br>Line two <span>styled</span></p>';
    const result = split(withBr, { keep: 100, by: 'character', stripTags: true, selectiveTags: ['span'] });
    expect(result.html).not.toContain('<span');
    expect(result.html).toContain('<br');
    expect(result.html).toContain('<p>');
  });

  it('backward compatible — no stripTags keeps all tags', () => {
    const result = split(html, { keep: 100, by: 'character' });
    expect(result.html).toBe(html);
  });
});
