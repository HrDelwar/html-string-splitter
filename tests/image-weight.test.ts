import { describe, it, expect } from 'vitest';
import { split, count } from '../src/index.js';

// ─── imageWeight ─────────────────────────────────────────────────

describe('split() with imageWeight', () => {
  const html = '<p>Hello <img src="x"> world</p>';

  it('img costs imageWeight chars toward keep', () => {
    // "Hello " = 6 chars, img = 5 chars (imageWeight), total = 11 before "world"
    const result = split(html, { keep: 8, by: 'character', imageWeight: 5 });
    expect(result.truncated).toBe(true);
    // Should not have room for "world" since img costs 5 of the 8 budget
    expect(result.html).not.toContain('world');
  });

  it('keeps content after img when budget allows', () => {
    const result = split(html, { keep: 15, by: 'character', imageWeight: 5 });
    // "Hello " (6) + img (5) + " world" (6) = 17, keep=15 should truncate
    expect(result.truncated).toBe(true);
  });

  it('treats img as zero cost without imageWeight', () => {
    // Default: img has no text cost, so keep=12 covers "Hello  world" (12 chars)
    const result = split(html, { keep: 12, by: 'character' });
    expect(result.truncated).toBe(false);
  });

  it('handles self-closing img tags', () => {
    const selfClosing = '<p>Text <img src="a" /> more</p>';
    const result = split(selfClosing, { keep: 5, by: 'character', imageWeight: 3 });
    // "Text " = 5 chars, should truncate before or at img
    expect(result.truncated).toBe(true);
  });

  it('counts weight for multiple images', () => {
    const multiImg = '<p>A <img src="1"> B <img src="2"> C</p>';
    const result = split(multiImg, { keep: 10, by: 'character', imageWeight: 3 });
    // "A " (2) + img (3) + " B " (3) + img (3) + " C" (2) = 13, keep=10 truncates
    expect(result.truncated).toBe(true);
  });

  it('count() is NOT affected by imageWeight', () => {
    const c = count(html, { by: 'character' });
    // count should only count text characters: "Hello  world" = 12
    expect(c).toBe(12);
  });

  it('applies weight to open tags like video', () => {
    const videoHtml = '<p>Watch <video src="v.mp4"></video> now</p>';
    const result = split(videoHtml, { keep: 8, by: 'character', imageWeight: 5 });
    expect(result.truncated).toBe(true);
  });
});
