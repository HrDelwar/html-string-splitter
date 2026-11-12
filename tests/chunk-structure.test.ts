import { describe, it, expect } from 'vitest';
import { chunk, text } from '../src/index.js';

const article =
  '<h1>Guide</h1><p>Intro text here. It has two sentences.</p>' +
  '<h2>Install</h2><p>Run the installer now. Then restart.</p>' +
  '<h3>Linux</h3><p>Use apt to install it. Done.</p>' +
  '<pre>code block line one\nline two</pre><p>Final words.</p>';

describe('chunk() breakAt: "block"', () => {
  it('ends chunks at block boundaries and starts them at headings', () => {
    expect(chunk(article, { size: 12, by: 'w', breakAt: 'block' })).toEqual([
      '<h1>Guide</h1><p>Intro text here. It has two sentences.</p>',
      '<h2>Install</h2><p>Run the installer now. Then restart.</p>',
      '<h3>Linux</h3><p>Use apt to install it. Done.</p>',
      '<pre>code block line one\nline two</pre><p>Final words.</p>',
    ]);
  });

  it('keeps tables and code blocks whole when they fit', () => {
    const html = '<p>a b</p><table><tr><td>c d</td><td>e f</td></tr></table><p>g h</p>';
    const chunks = chunk(html, { size: 5, by: 'w', breakAt: 'block' });
    expect(chunks[0]).toBe('<p>a b</p>');
    expect(chunks[1]).toContain('<td>c d</td><td>e f</td>');
  });

  it('falls back to sentences, then words, inside a long block', () => {
    const html = '<p>One two three. Four five six seven. Eight nine.</p>';
    expect(chunk(html, { size: 5, by: 'w', breakAt: 'block' })).toEqual([
      '<p>One two three.</p>',
      '<p>Four five six seven.</p>',
      '<p>Eight nine.</p>',
    ]);
  });
});

describe('chunk() breakAt: "sentence"', () => {
  it('ends on sentence boundaries', () => {
    const html = '<p>A b c. D e f g. H i.</p>';
    expect(chunk(html, { size: 4, by: 'w', breakAt: 'sentence' })).toEqual(['<p>A b c.</p>', '<p>D e f g.</p>', '<p>H i.</p>']);
  });

  it('snaps overlap to a sentence start', () => {
    const html = '<p>A b c. D e. F g h.</p>';
    const chunks = chunk(html, { size: 5, by: 'w', breakAt: 'sentence', overlap: 2 });
    expect(chunks[1].startsWith('<p>D e.')).toBe(true);
  });
});

describe('chunk() meta', () => {
  it('returns html, text, offsets and the heading trail', () => {
    const chunks = chunk(article, { size: 12, by: 'w', breakAt: 'block', meta: true });
    expect(chunks.map(c => c.headings)).toEqual([
      ['Guide'],
      ['Guide', 'Install'],
      ['Guide', 'Install', 'Linux'],
      ['Guide', 'Install', 'Linux'],
    ]);
    expect(chunks[1]).toMatchObject({ index: 1, start: 8, end: 15, text: 'Install\nRun the installer now. Then restart.' });
  });

  it('pops sibling headings off the trail', () => {
    const html = '<h2>A</h2><p>x y z</p><h2>B</h2><p>u v w</p>';
    const chunks = chunk(html, { size: 4, by: 'w', breakAt: 'block', meta: true });
    expect(chunks.map(c => c.headings)).toEqual([['A'], ['B']]);
  });

  it('returns a single meta chunk when everything fits', () => {
    const [only] = chunk('<h1>T</h1><p>a b</p>', { size: 10, by: 'w', meta: true });
    expect(only).toMatchObject({ html: '<h1>T</h1><p>a b</p>', index: 0, start: 0, end: 3, headings: ['T'] });
  });
});

describe('chunk() keeps all content', () => {
  it('concatenated chunk text equals the document text', () => {
    const chunks = chunk(article, { size: 7, by: 'c', breakAt: 'word', meta: true });
    const squash = (t: string) => t.replace(/\s+/g, '');
    expect(squash(chunks.map(c => c.text).join(''))).toBe(squash(text(article)));
  });
});
