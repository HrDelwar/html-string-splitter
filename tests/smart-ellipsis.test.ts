import { describe, it, expect } from 'vitest';
import { split } from '../src/index.js';

// ─── smartEllipsis ───────────────────────────────────────────────

describe('split() with smartEllipsis', () => {
  it('skips ellipsis when truncation falls at block boundary', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>';
    // Split after first paragraph — clean block boundary
    const result = split(html, { keep: 15, by: 'character', smartEllipsis: true });
    // Truncation at the end of </p> should skip "..."
    expect(result.truncated).toBe(true);
    expect(result.html).not.toContain('...');
  });

  it('keeps ellipsis when truncation is mid-paragraph', () => {
    const html = '<p>This is a long paragraph that should be cut in the middle</p>';
    const result = split(html, { keep: 10, by: 'character', smartEllipsis: true });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('...');
  });

  it('always shows ellipsis when smartEllipsis is false (default)', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>';
    const result = split(html, { keep: 15, by: 'character' });
    if (result.truncated) {
      expect(result.html).toContain('...');
    }
  });

  it('respects custom ellipsis with smartEllipsis', () => {
    const html = '<p>Short text in a paragraph that is mid-sentence and long enough to truncate here</p>';
    const result = split(html, { keep: 10, by: 'character', smartEllipsis: true, ellipsis: ' …' });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain(' …');
  });

  it('does not add ellipsis when content is not truncated', () => {
    const html = '<p>Short</p>';
    const result = split(html, { keep: 100, by: 'character', smartEllipsis: true });
    expect(result.truncated).toBe(false);
    expect(result.html).not.toContain('...');
  });

  it('works with word-based splitting at block boundary', () => {
    const html = '<p>One two three</p><p>Four five six</p>';
    const result = split(html, { keep: 3, by: 'word', smartEllipsis: true });
    expect(result.truncated).toBe(true);
    // Cut at end of first <p> — block boundary, so no ellipsis
    expect(result.html).not.toContain('...');
  });

  it('works with word-based splitting mid-paragraph', () => {
    const html = '<p>One two three four five six seven eight</p>';
    const result = split(html, { keep: 3, by: 'word', smartEllipsis: true });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('...');
  });
});
