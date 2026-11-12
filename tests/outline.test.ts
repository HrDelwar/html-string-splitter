import { describe, it, expect } from 'vitest';
import { outline, section, chunk, parse } from '../src/index.js';

const html =
  '<article><h1>Guide</h1><p>Intro text here.</p>' +
  '<h2 id="install">Install</h2><p>Run npm install now.</p>' +
  '<h3>From source</h3><p>Clone the repo and build it.</p>' +
  '<h2>Usage &amp; API</h2><p>Call clip.</p>' +
  '<h2>Usage &amp; API</h2><p>Again.</p></article>';

describe('outline()', () => {
  it('builds the heading tree with ids, slugs and section word counts', () => {
    expect(outline(html)).toEqual([
      {
        level: 1, text: 'Guide', slug: 'guide', index: 0, words: 25,
        children: [
          {
            level: 2, text: 'Install', id: 'install', slug: 'install', index: 1, words: 12,
            children: [{ level: 3, text: 'From source', slug: 'from-source', index: 2, words: 6, children: [] }],
          },
          { level: 2, text: 'Usage & API', slug: 'usage--api', index: 3, words: 2, children: [] },
          { level: 2, text: 'Usage & API', slug: 'usage--api-1', index: 4, words: 1, children: [] },
        ],
      },
    ]);
  });

  it('limits depth with maxLevel without changing indexes or word counts', () => {
    const tree = outline(html, { maxLevel: 2 });
    expect(tree[0].children.map(c => [c.slug, c.index, c.words, c.children.length])).toEqual([
      ['install', 1, 12, 0], ['usage--api', 3, 2, 0], ['usage--api-1', 4, 1, 0],
    ]);
  });

  it('starts new roots for headings that skip levels or come first at a lower level', () => {
    const tree = outline('<h3>a</h3><h2>b</h2><h4>c</h4><h1>d</h1>');
    expect(tree.map(i => [i.text, i.children.map(c => c.text)])).toEqual([['a', []], ['b', ['c']], ['d', []]]);
  });

  it('reads heading text across inline tags and entities, and skips empty headings', () => {
    const tree = outline('<h2 class="x" id=\'a&amp;b\'>Hello <em>big</em>\n world</h2><h2></h2><h2>  </h2>');
    expect(tree).toEqual([{ level: 2, text: 'Hello big world', id: 'a&b', slug: 'a&b', index: 0, words: 0, children: [] }]);
  });

  it('keeps generated slugs clear of existing ids', () => {
    const tree = outline('<h2>Intro</h2><h2 id="intro">Other</h2><h2>Intro</h2>');
    expect(tree.map(i => i.slug)).toEqual(['intro-1', 'intro', 'intro-2']);
  });

  it('ignores headings inside hidden elements', () => {
    expect(outline('<template><h2>No</h2></template><h2>Yes</h2>').map(i => i.text)).toEqual(['Yes']);
  });

  it('handles empty input and documents without headings', () => {
    expect(outline('')).toEqual([]);
    expect(outline('<p>none</p>')).toEqual([]);
  });
});

describe('section()', () => {
  it('returns a section with its subsections by id, slug, text or index', () => {
    const install = '<article><h2 id="install">Install</h2><p>Run npm install now.</p><h3>From source</h3><p>Clone the repo and build it.</p></article>';
    expect(section(html, 'install')).toBe(install);
    expect(section(html, 'from-source')).toBe('<article><h3>From source</h3><p>Clone the repo and build it.</p></article>');
    expect(section(html, ' usage & api ')).toBe('<article><h2>Usage &amp; API</h2><p>Call clip.</p></article>');
    expect(section(html, 'usage--api-1')).toBe('<article><h2>Usage &amp; API</h2><p>Again.</p></article>');
    expect(section(html, 1)).toBe(install);
  });

  it('can leave out the heading', () => {
    expect(section(html, 'from-source', { includeHeading: false })).toBe('<article><p>Clone the repo and build it.</p></article>');
    expect(section('<h2>a</h2><h2>b</h2>', 0, { includeHeading: false })).toBe('');
  });

  it('returns the rest of the document for the last section', () => {
    expect(section(html, 0)).toBe(html);
  });

  it('returns an empty string when nothing matches', () => {
    expect(section(html, 'missing')).toBe('');
    expect(section(html, 99)).toBe('');
    expect(section('', 'install')).toBe('');
  });

  it('works on a parsed document', () => {
    const doc = parse(html);
    expect(doc.outline()[0].children[0].slug).toBe('install');
    expect(doc.section('install')).toBe(section(html, 'install'));
  });
});

describe('chunk() anchor', () => {
  it('reports the nearest enclosing heading id', () => {
    const chunks = chunk(html, { size: 6, by: 'w', breakAt: 'block', meta: true });
    expect(chunks.map(c => c.anchor)).toEqual([undefined, 'install', 'install', 'install', undefined, undefined]);
    expect('anchor' in chunks[0]).toBe(false);
  });
});
