import { describe, it, expect } from 'vitest';
import { split, clip, count, splitAt, slice, chunk, wrap, summary, highlight, text } from '../src/index.js';

describe('entity-safe output', () => {
  it('keeps escaped markup escaped when cutting by word', () => {
    const html = clip('<p>a &lt;b&gt;x&lt;/b&gt; c d</p>', { keep: 2, by: 'w' });
    expect(html).toBe('<p>a &lt;b&gt;x&lt;/b&gt;...</p>');
  });

  it('keeps escaped markup escaped when cutting by sentence', () => {
    const html = clip('<p>One &lt;script&gt;. Two. Three.</p>', { keep: 1, by: 's' });
    expect(html).toBe('<p>One &lt;script&gt;....</p>');
  });

  it('keeps the second half of splitAt escaped', () => {
    const [, after] = splitAt('<p>a b &lt;script&gt;alert(1)&lt;/script&gt;</p>', { at: 1, by: 'w' });
    expect(after).toBe('<p>b &lt;script&gt;alert(1)&lt;/script&gt;</p>');
    expect(after).not.toContain('<script>');
  });

  it('keeps wrap output escaped', () => {
    const html = wrap('<p>a &lt;img onerror=x&gt; b</p>', { every: 2, by: 'w' });
    expect(html).not.toMatch(/<img/);
  });

  it('keeps escaped selectiveTags text escaped', () => {
    const r = split('<p><b>x &lt;i&gt; y z</b></p>', { keep: 3, by: 'w', stripTags: true, selectiveTags: ['b'] });
    expect(r.html).toBe('<p>x &lt;i&gt; y...</p>');
  });

  it('preserves &nbsp; and other entities verbatim', () => {
    expect(clip('<p>A&nbsp;B&nbsp;C&nbsp;D</p>', { keep: 3 })).toBe('<p>A&nbsp;B...</p>');
  });
});

describe('whitespace and grapheme fidelity', () => {
  it('preserves original whitespace inside a word cut', () => {
    expect(clip('<p>a\n\n  b   c d</p>', { keep: 2, by: 'w' })).toBe('<p>a\n\n  b...</p>');
  });

  it('cuts emoji by grapheme', () => {
    expect(clip('<p>😀😀😀😀</p>', { keep: 2 })).toBe('<p>😀😀...</p>');
    expect(clip('<p>👨‍👩‍👧👨‍👩‍👧👨‍👩‍👧</p>', { keep: 1 })).toBe('<p>👨‍👩‍👧...</p>');
  });

  it('handles a bare ampersand next to a later semicolon', () => {
    expect(clip('<p>AT&T is great; yes</p>', { keep: 4 })).toBe('<p>AT&T...</p>');
  });

  it('maps astral numeric entities correctly', () => {
    expect(clip('<p>&#128512;&#128512;&#128512;</p>', { keep: 1 })).toBe('<p>&#128512;...</p>');
  });
});

describe('cross-tag units', () => {
  it('counts a word split by inline tags once', () => {
    expect(count('<p>un<b>believ</b>able</p>', { by: 'w' })).toBe(1);
  });

  it('keeps a split word whole when truncating', () => {
    expect(clip('<p>a un<b>believ</b>able c</p>', { keep: 2, by: 'w' })).toBe('<p>a un<b>believ</b>able...</p>');
  });

  it('counts sentences across inline tags', () => {
    expect(count('<p>This is <b>bold</b> text. Next one.</p>', { by: 's' })).toBe(2);
    expect(summary('<p>This is <b>bold</b> text. Next one.</p>').sentences).toBe(2);
  });

  it('detects a sentence break that straddles a tag', () => {
    expect(count('<p>End.<b> Next</b> part.</p>', { by: 's' })).toBe(2);
  });

  it('ends sentences at block boundaries', () => {
    expect(count('<p>No period</p><p>Another</p>', { by: 's' })).toBe(2);
  });

  it('does not join words across block elements', () => {
    expect(count('<p>one</p><p>two</p>', { by: 'w' })).toBe(2);
    expect(count('one<br>two', { by: 'w' })).toBe(2);
  });
});

describe('lines are visual lines', () => {
  it('ignores wrapper blocks without their own content', () => {
    expect(count('<ul><li>a</li><li>b</li></ul>', { by: 'l' })).toBe(2);
    expect(count('<div><p>x</p></div>', { by: 'l' })).toBe(1);
  });

  it('counts a blank line from consecutive <br>', () => {
    expect(count('a<br><br>b', { by: 'l' })).toBe(3);
  });

  it('counts <hr> as a line', () => {
    expect(count('<p>a</p><hr><p>b</p>', { by: 'l' })).toBe(3);
  });

  it('cuts inside the last kept line', () => {
    expect(clip('<p>A</p><p>B</p>', { keep: 1, by: 'l' })).toBe('<p>A...</p>');
  });
});

describe('options apply consistently', () => {
  it('drops excluded self-closing elements', () => {
    expect(clip('<p>Hello <img src=x> world foo</p>', { keep: 8, exclude: ['img'] })).toBe('<p>Hello  w...</p>');
  });

  it('from: "end" honors exclude', () => {
    const r = split('<p>Hello <i>secret</i> world</p>', { keep: 5, from: 'end', exclude: ['i'] });
    expect(r.html).toBe('...<p>world</p>');
  });

  it('from: "end" honors preserveWords', () => {
    expect(clip('<p>Hello beautiful world</p>', { keep: 7, from: 'end', preserveWords: true })).toBe('...<p>world</p>');
  });

  it('from: "end" honors stripComments and output both', () => {
    const r = split('<p>a <!-- c --> b c</p>', { keep: 2, by: 'w', from: 'end', stripComments: true, output: 'both' });
    expect(r.html).toBe('...<p>b c</p>');
    expect(r.text).toBe('b c');
  });

  it('excludes elements from tag-mode counts', () => {
    expect(count('<p>a</p><aside><p>b</p></aside>', { by: 'p', exclude: ['aside'] })).toBe(1);
  });

  it('splitAt, slice and chunk honor exclude', () => {
    const html = '<p>one <i>skip</i> two three</p>';
    expect(splitAt(html, { at: 1, by: 'w', exclude: ['i'] })[1]).toBe('<p>two three</p>');
    expect(slice(html, { start: 1, end: 2, by: 'w', exclude: ['i'] })).toBe('<p>two</p>');
    expect(chunk(html, { size: 2, by: 'w', exclude: ['i'] })).toEqual(['<p>one  two</p>', '<p>three</p>']);
  });

  it('ignores hidden text when skipping', () => {
    const [before, after] = splitAt('<title>Ttl</title><p>Hello world</p>', { at: 3 });
    expect(before).toBe('<title>Ttl</title><p>Hel</p>');
    expect(after).toBe('<title>Ttl</title><p>lo world</p>');
  });

  it('drops comments from stripped text', () => {
    expect(split('<p>a <!-- x --> b c</p>', { keep: 2, by: 'w', stripTags: true }).html).toBe('a  b...');
  });
});

describe('structure', () => {
  it('never emits a closing tag for doctype', () => {
    expect(clip('<!DOCTYPE html><html><body><p>Hello world</p></body></html>', { keep: 3 }))
      .toBe('<!DOCTYPE html><html><body><p>Hel...</p></body></html>');
  });

  it('closes implicitly-closed paragraphs once', () => {
    expect(clip('<p>one<p>two three four', { keep: 5 })).toBe('<p>one<p>tw...</p>');
  });

  it('closes implicitly-closed list items once', () => {
    expect(clip('<ul><li>a<li>b<li>c</ul>', { keep: 2 })).toBe('<ul><li>a<li>b...</li></ul>');
  });

  it('closes inline elements left open inside a closed block', () => {
    expect(clip('<div><b>x</div><p>more text</p>', { keep: 3 })).toBe('<div><b>x</div><p>mo...</p>');
  });

  it('reopens ancestors without empty shells when skipping', () => {
    expect(splitAt('<p>a b</p><p>c d</p>', { at: 2, by: 'w' })[1]).toBe('<p>c d</p>');
  });
});

describe('highlight keeps source text', () => {
  it('preserves entities around and inside matches', () => {
    expect(highlight('<p>A &amp; B &nbsp;x</p>', '&')).toBe('<p>A <mark>&amp;</mark> B &nbsp;x</p>');
  });

  it('highlights a match spanning tags', () => {
    expect(highlight('<p>hel<b>lo</b> x</p>', 'hello')).toBe('<p><mark>hel</mark><b><mark>lo</mark></b> x</p>');
  });
});

describe('text() still extracts plain text', () => {
  it('decodes entities', () => {
    expect(text('<p>a &amp; b</p>')).toBe('a & b');
  });
});
