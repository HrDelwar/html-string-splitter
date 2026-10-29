import { describe, it, expect } from 'vitest';
import { excerpt, snippet, parse } from '../src/index.js';

describe('excerpt()', () => {
  const article = '<h1>Guide</h1><p>Intro text here. It has two sentences.</p><h2>Install</h2><p>Run the installer now.</p>';

  it('returns the input when it fits', () => {
    expect(excerpt('<p>short</p>', { max: 100 })).toEqual({ html: '<p>short</p>', truncated: false, total: 5, kept: 5 });
  });

  it('prefers a block boundary inside the range and skips the ellipsis there', () => {
    const r = excerpt(article, { max: 60, min: 20 });
    expect(r.html).toBe('<h1>Guide</h1><p>Intro text here. It has two sentences.</p>');
    expect(r.truncated).toBe(true);
  });

  it('falls back to a sentence boundary', () => {
    const r = excerpt('<p>First sentence here. Second sentence goes on and on.</p>', { max: 40, min: 15 });
    expect(r.html).toBe('<p>First sentence here....</p>');
  });

  it('falls back to a word boundary', () => {
    const r = excerpt('<p>alpha beta gamma delta epsilon</p>', { max: 14, min: 5 });
    expect(r.html).toBe('<p>alpha beta...</p>');
  });

  it('hard-cuts when no boundary is in range', () => {
    const r = excerpt('<p>Supercalifragilistic</p>', { max: 5, min: 3 });
    expect(r.html).toBe('<p>Super...</p>');
  });

  it('never ends on a heading', () => {
    const r = excerpt('<p>One two three.</p><h2>Next</h2><p>More words follow here.</p>', { max: 22, min: 10 });
    expect(r.html).toBe('<p>One two three.</p>');
  });

  it('honors a custom preference order', () => {
    const html = '<p>A b. C d e f g h</p><p>i</p>';
    expect(excerpt(html, { max: 12, min: 2, by: 'c', prefer: ['word'] }).html).toBe('<p>A b. C d e f...</p>');
  });

  it('works by word', () => {
    const r = excerpt('<p>One two. Three four five six.</p>', { max: 5, min: 1, by: 'w' });
    expect(r.html).toBe('<p>One two....</p>');
  });
});

describe('snippet()', () => {
  const doc = '<h2>Install</h2><p>Download the installer, then run it to begin. Restart afterwards.</p><p>Use apt to install on Linux systems.</p>';

  it('returns a window of words around the match with highlight', () => {
    expect(snippet(doc, 'installer', { radius: 2 })).toBe('…<p>Download the <mark>installer</mark>, then run</p>…');
  });

  it('returns empty when nothing matches', () => {
    expect(snippet(doc, 'zebra')).toBe('');
    expect(snippet('', 'x')).toBe('');
  });

  it('merges nearby matches and joins distant ones', () => {
    const out = snippet(doc, /install/i, { radius: 1, maxSnippets: 3 });
    expect(out).toBe('<h2><mark>Install</mark></h2><p>Download the <mark>install</mark>er, then</p> … <p>to <mark>install</mark> on</p>…');
  });

  it('stops at maxSnippets', () => {
    const out = snippet(doc, /install/i, { radius: 0, maxSnippets: 1 });
    expect(out).toBe('<h2><mark>Install</mark></h2>…');
  });

  it('omits the leading ellipsis at document start and trailing one at the end', () => {
    expect(snippet('<p>a b c</p>', 'c', { radius: 5 })).toBe('<p>a b <mark>c</mark></p>');
  });

  it('separates blocks in plain text', () => {
    expect(snippet('<p>one two.</p><p>three four</p>', 'three', { radius: 1, stripTags: true })).toBe('…two. <mark>three</mark> four');
  });

  it('can return escaped plain text', () => {
    const out = snippet('<p>a &lt;b&gt; tag <b>here</b> ok</p>', 'tag', { radius: 1, stripTags: true });
    expect(out).toBe('…&lt;b&gt; <mark>tag</mark> here…');
  });

  it('supports custom highlight tags and no highlight', () => {
    expect(snippet('<p>x y z</p>', 'y', { radius: 0, highlight: { tag: 'em', className: 'hit' } }))
      .toBe('…<p><em class="hit">y</em></p>…');
    expect(snippet('<p>x y z</p>', 'y', { radius: 0, highlight: false })).toBe('…<p>y</p>…');
  });

  it('highlights matches that span tags', () => {
    expect(snippet('<p>one hel<b>lo</b> two</p>', 'hello', { radius: 0 })).toBe('…<p><mark>hel</mark><b><mark>lo</mark></b></p>…');
  });

  it('is available on parsed documents', () => {
    const d = parse(doc);
    expect(d.snippet('Linux', { radius: 1 })).toBe('…<p>on <mark>Linux</mark> systems.</p>');
    expect(d.excerpt({ max: 20 }).truncated).toBe(true);
  });
});
