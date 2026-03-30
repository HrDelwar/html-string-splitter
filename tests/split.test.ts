import { describe, it, expect } from 'vitest';
import { split, count } from '../src/index.js';

// ─── split() by character ─────────────────────────────────────────

describe('split() by character', () => {
  const html = '<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>';

  it('truncates at character count', () => {
    const result = split(html, { keep: 15, by: 'character' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(15);
    expect(result.html).toContain('...');
  });

  it('returns full content when count exceeds total', () => {
    const result = split(html, { keep: 9999, by: 'character' });
    expect(result.truncated).toBe(false);
    expect(result.html).toBe(html);
  });

  it('handles count of 0', () => {
    const result = split(html, { keep: 0, by: 'character' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(0);
    expect(result.html).toBe('...');
  });

  it('handles count of 1', () => {
    const result = split(html, { keep: 1, by: 'character' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(1);
  });

  it('appends custom ellipsis', () => {
    const result = split('<p>Hello world</p>', { keep: 5, by: 'character', ellipsis: ' …' });
    expect(result.html).toContain(' …');
    expect(result.html).not.toContain('...');
  });

  it('appends suffix after ellipsis', () => {
    const result = split('<p>Hello world</p>', {
      keep: 5,
      by: 'character',
      suffix: '<button>More</button>',
    });
    expect(result.html).toContain('...<button>More</button>');
  });

  it('preserves whole words when preserveWords is true', () => {
    const result = split('<p>Hello beautiful world</p>', {
      keep: 8,
      by: 'character',
      preserveWords: true,
    });
    // Should not cut "beauti" mid-word
    expect(result.html).toMatch(/<p>Hello...<\/p>/);
  });

  it('strips tags when stripTags is true', () => {
    const result = split('<p>Hello <strong>world</strong></p>', {
      keep: 7,
      by: 'character',
      stripTags: true,
    });
    expect(result.html).not.toContain('<');
    expect(result.html).toContain('Hello w');
  });
});

// ─── split() by word ──────────────────────────────────────────────

describe('split() by word', () => {
  const html = '<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>';

  it('truncates at word count', () => {
    const result = split(html, { keep: 6, by: 'word' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(6);
    expect(result.html).toContain('...');
  });

  it('returns full content when count exceeds total words', () => {
    const result = split(html, { keep: 9999, by: 'word' });
    expect(result.truncated).toBe(false);
  });
});

// ─── split() by sentence ─────────────────────────────────────────

describe('split() by sentence', () => {
  it('splits by sentence count', () => {
    const html = '<p>First sentence. Second sentence. Third sentence.</p>';
    const result = split(html, { keep: 2, by: 'sentence' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(2);
  });
});

// ─── split() edge cases ──────────────────────────────────────────

describe('split() edge cases', () => {
  it('returns empty result for null/undefined/empty input', () => {
    expect(split('', { keep: 5 }).html).toBe('');
    expect(split(null as any, { keep: 5 }).html).toBe('');
    expect(split(undefined as any, { keep: 5 }).html).toBe('');
  });

  it('returns empty result for invalid count', () => {
    expect(split('<p>Hello</p>', { keep: -1 }).html).toBe('');
    expect(split('<p>Hello</p>', { keep: NaN }).html).toBe('');
    expect(split('<p>Hello</p>', { keep: Infinity }).html).toBe('');
  });

  it('handles plain text without tags', () => {
    const result = split('Hello world', { keep: 5, by: 'character' });
    expect(result.truncated).toBe(true);
    expect(result.html).toBe('Hello...');
  });

  it('handles self-closing tags', () => {
    const result = split('Hello<br/>world', { keep: 7, by: 'character' });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('<br/>');
  });

  it('handles HTML entities correctly', () => {
    const result = split('<p>A &amp; B</p>', { keep: 3, by: 'character' });
    expect(result.truncated).toBe(true);
    // "A & B" is 5 chars, so 3 chars = "A &" which in raw is "A &amp;"
    expect(result.kept).toBe(3);
  });

  it('handles emoji correctly', () => {
    const result = split('<p>Hi 😀 world</p>', { keep: 4, by: 'character' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(4);
  });

  it('handles whitespace-only content', () => {
    const result = split('<p>   </p>', { keep: 1, by: 'character' });
    expect(result.truncated).toBe(true);
  });

  it('handles nested tags and closes them properly', () => {
    const result = split('<div><p><span>Hello world</span></p></div>', {
      keep: 5,
      by: 'character',
    });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('</span>');
    expect(result.html).toContain('</p>');
    expect(result.html).toContain('</div>');
  });

  it('handles deeply nested HTML', () => {
    const html = '<div><section><article><p><span><em><strong>Deep text</strong></em></span></p></article></section></div>';
    const result = split(html, { keep: 4, by: 'character' });
    expect(result.truncated).toBe(true);
    // All tags should be properly closed
    const openTags = (result.html.match(/<(?!\/)[a-z]+[^/>]*>/g) ?? []).length;
    const closeTags = (result.html.match(/<\/[a-z]+>/g) ?? []).length;
    expect(openTags).toBe(closeTags);
  });

  it('handles text before first tag (v1 bug #1)', () => {
    const result = split('Hello <p>world</p>', { keep: 7, by: 'character' });
    expect(result.html).toContain('Hello');
  });

  it('handles img tags (v1 bug #2)', () => {
    const result = split('<p>Text<img src="pic.jpg">more text</p>', { keep: 8, by: 'character' });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('<img src="pic.jpg">');
  });

  it('drops everything after truncation point', () => {
    const html = '<p>Hello world</p><div class="animated-box"></div><a href="#">Link</a>';
    const result = split(html, { keep: 5, by: 'c' });
    expect(result.html).not.toContain('animated-box');
    expect(result.html).not.toContain('Link');
  });

  it('defaults to character splitting', () => {
    const result = split('<p>Hello</p>', { keep: 3 });
    expect(result.kept).toBe(3);
  });

  it('accepts short alias "c" for character', () => {
    const result = split('<p>Hello world</p>', { keep: 5, by: 'c' });
    expect(result.kept).toBe(5);
    expect(result.truncated).toBe(true);
  });

  it('accepts short alias "w" for word', () => {
    const result = split('<p>Hello beautiful world</p>', { keep: 2, by: 'w' });
    expect(result.kept).toBe(2);
    expect(result.truncated).toBe(true);
  });

  it('accepts short alias "s" for sentence', () => {
    const result = split('<p>First. Second. Third.</p>', { keep: 1, by: 's' });
    expect(result.kept).toBe(1);
    expect(result.truncated).toBe(true);
  });

  it('accepts tag name for element counting', () => {
    const result = count('<p>Para one</p><p>Para two</p>', { by: 'p' });
    expect(result).toBe(2);
  });
});

// ─── style/script handling ────────────────────────────────────────

describe('style/script tag handling', () => {
  it('does not count style tag content as text', () => {
    expect(count('<style>body{color:red}</style><p>Hello</p>')).toBe(5);
  });

  it('does not count script tag content as text', () => {
    expect(count('<script>var x = 1;</script><p>Hello</p>')).toBe(5);
  });

  it('preserves style tag in split output', () => {
    const result = split('<style>.x{color:red}</style><p>Hello world</p>', { keep: 5, by: 'c' });
    expect(result.html).toContain('<style>.x{color:red}</style>');
    expect(result.kept).toBe(5);
  });

  it('preserves script tag in split output', () => {
    const result = split('<script>alert(1)</script><p>Hello world</p>', { keep: 5, by: 'c' });
    expect(result.html).toContain('<script>alert(1)</script>');
    expect(result.kept).toBe(5);
  });

  it('handles mixed style + script + content', () => {
    const html = '<style>.red{color:red}</style><script>console.log(1)</script><p>Hello world</p>';
    expect(count(html)).toBe(11);
    const result = split(html, { keep: 5, by: 'c' });
    expect(result.html).toContain('<style>');
    expect(result.html).toContain('<script>');
    expect(result.kept).toBe(5);
  });

  it('strips style/script tags when stripTags is true', () => {
    const result = split('<style>.x{}</style><p>Hello</p>', { keep: 5, by: 'c', stripTags: true });
    expect(result.html).not.toContain('<style>');
    expect(result.html).not.toContain('.x{}');
  });

  it('handles noscript tag', () => {
    expect(count('<noscript>Enable JS</noscript><p>Hello</p>')).toBe(5);
  });
});

// ─── non-visible elements (head, title, template) ─────────────────

describe('non-visible element handling', () => {
  it('does not count title tag content', () => {
    expect(count('<head><title>My Page</title></head><body><p>Hello</p></body>')).toBe(5);
  });

  it('does not count any text inside head', () => {
    const doc = '<html><head><meta charset="utf-8"><title>Page</title></head><body><p>Hello world</p></body></html>';
    expect(count(doc)).toBe(11);
    expect(count(doc, { by: 'w' })).toBe(2);
  });

  it('preserves head content in split output', () => {
    const doc = '<html><head><title>Page</title></head><body><p>Hello world</p></body></html>';
    const result = split(doc, { keep: 5, by: 'c' });
    expect(result.html).toContain('<title>Page</title>');
    expect(result.kept).toBe(5);
  });

  it('handles full HTML document with style, script, and head', () => {
    const doc = '<html><head><title>T</title><style>.x{}</style><script>var x</script></head><body><p>Visible text</p></body></html>';
    expect(count(doc)).toBe(12);
    const result = split(doc, { keep: 7, by: 'c' });
    expect(result.html).toContain('<head>');
    expect(result.html).toContain('<title>T</title>');
    expect(result.html).toContain('<style>.x{}</style>');
    expect(result.kept).toBe(7);
  });

  it('does not count template tag content', () => {
    expect(count('<template>Hidden</template><p>Visible</p>')).toBe(7);
  });

  it('strips non-visible text when stripTags is true', () => {
    const doc = '<head><title>Page</title></head><body><p>Hello</p></body>';
    const result = split(doc, { keep: 5, by: 'c', stripTags: true });
    expect(result.html).not.toContain('Page');
    expect(result.html).toBe('Hello');
  });
});

// ─── split() from: 'end' ─────────────────────────────────────────

describe('split() from: end', () => {
  it('keeps the last N characters', () => {
    const result = split('<p>Hello world</p>', { keep: 5, by: 'c', from: 'end' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(5);
    expect(result.html).toContain('world');
    expect(result.html).toContain('...');
  });

  it('keeps the last N words', () => {
    const result = split('<p>One two three four five</p>', { keep: 2, by: 'w', from: 'end' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(2);
    expect(result.html).toContain('four');
    expect(result.html).toContain('five');
  });

  it('returns full content when count >= total', () => {
    const result = split('<p>Hello</p>', { keep: 100, by: 'c', from: 'end' });
    expect(result.truncated).toBe(false);
    expect(result.html).toBe('<p>Hello</p>');
  });

  it('returns ellipsis for count 0', () => {
    const result = split('<p>Hello</p>', { keep: 0, by: 'c', from: 'end' });
    expect(result.html).toBe('...');
    expect(result.truncated).toBe(true);
  });

  it('places ellipsis at the beginning', () => {
    const result = split('<p>Hello world</p>', { keep: 5, by: 'c', from: 'end' });
    expect(result.html.startsWith('...')).toBe(true);
  });

  it('handles nested tags', () => {
    const result = split('<div><p>Hello</p><p>world</p></div>', { keep: 5, by: 'c', from: 'end' });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('world');
  });

  it('handles entities', () => {
    const result = split('<p>A &amp; B &amp; C</p>', { keep: 3, by: 'c', from: 'end' });
    expect(result.truncated).toBe(true);
  });
});
