import { describe, it, expect } from 'vitest';
import { split, count } from '../src/index.js';

// ─── exclude ─────────────────────────────────────────────────────

describe('split() with exclude', () => {
  it('removes figcaption and its content', () => {
    const html = '<figure><img src="x"><figcaption>Caption text</figcaption></figure>';
    const result = split(html, { keep: 100, by: 'character', exclude: ['figcaption'] });
    expect(result.html).not.toContain('figcaption');
    expect(result.html).not.toContain('Caption text');
    expect(result.html).toContain('<img src="x">');
  });

  it('removes script tags and content', () => {
    const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    const result = split(html, { keep: 100, by: 'character', exclude: ['script'] });
    expect(result.html).not.toContain('script');
    expect(result.html).not.toContain('alert');
    expect(result.html).toContain('Hello');
    expect(result.html).toContain('World');
  });

  it('excluded content does not count toward keep', () => {
    const html = '<p>Hello</p><figcaption>This is a long caption</figcaption><p>World</p>';
    const result = split(html, { keep: 10, by: 'character', exclude: ['figcaption'] });
    // "Hello" (5) + "World" (5) = 10 chars of countable text
    expect(result.html).toContain('World');
    expect(result.truncated).toBe(false);
  });

  it('handles nested exclusions', () => {
    const html = '<div><aside><p>Sidebar</p><span>Extra</span></aside><p>Main content</p></div>';
    const result = split(html, { keep: 100, by: 'character', exclude: ['aside'] });
    expect(result.html).not.toContain('Sidebar');
    expect(result.html).not.toContain('Extra');
    expect(result.html).toContain('Main content');
  });

  it('handles multiple excluded tags', () => {
    const html = '<p>Keep</p><nav>Nav link</nav><footer>Footer text</footer><p>Also keep</p>';
    const result = split(html, { keep: 100, by: 'character', exclude: ['nav', 'footer'] });
    expect(result.html).not.toContain('Nav link');
    expect(result.html).not.toContain('Footer text');
    expect(result.html).toContain('Keep');
    expect(result.html).toContain('Also keep');
  });

  it('handles self-closing excluded tags', () => {
    const html = '<p>Text <hr> more text</p>';
    const result = split(html, { keep: 100, by: 'character', exclude: ['hr'] });
    expect(result.html).not.toContain('<hr');
    expect(result.html).toContain('Text');
    expect(result.html).toContain('more text');
  });

  it('is backward compatible without exclude option', () => {
    const html = '<p>Hello <figcaption>Caption</figcaption> world</p>';
    const result = split(html, { keep: 100, by: 'character' });
    expect(result.html).toContain('figcaption');
    expect(result.html).toContain('Caption');
  });
});
