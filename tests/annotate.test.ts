import { describe, it, expect } from 'vitest';
import { annotate, text, parse, highlight } from '../src/index.js';

const html = '<p>Ada Lovelace met <b>Charles Bab</b>bage in London.</p><p>They wrote &amp; published notes.</p>';
const plain = text(html, { separator: '\n' });
const at = (s: string) => ({ start: plain.indexOf(s), end: plain.indexOf(s) + s.length });

describe('annotate()', () => {
  it('wraps a range of the plain text', () => {
    expect(annotate(html, [at('London')], { separator: '\n' }))
      .toBe('<p>Ada Lovelace met <b>Charles Bab</b>bage in <mark>London</mark>.</p><p>They wrote &amp; published notes.</p>');
  });

  it('splits a range at element boundaries', () => {
    expect(annotate(html, [at('Charles Babbage')], { separator: '\n' }))
      .toBe('<p>Ada Lovelace met <b><mark>Charles Bab</mark></b><mark>bage</mark> in London.</p><p>They wrote &amp; published notes.</p>');
  });

  it('keeps entities intact inside a range', () => {
    expect(annotate(html, [at('wrote & published')], { separator: '\n', tag: 'u' }))
      .toBe('<p>Ada Lovelace met <b>Charles Bab</b>bage in London.</p><p>They <u>wrote &amp; published</u> notes.</p>');
  });

  it('nests ranges and applies per-range markup', () => {
    const out = annotate(html, [
      { ...at('Ada Lovelace'), className: 'person' },
      { ...at('London'), className: 'place', attributes: { 'data-id': 'Q84' } },
      { ...at('Ada Lovelace met Charles Babbage in London.'), tag: 'span', className: 's' },
    ], { separator: '\n' });
    expect(out).toBe(
      '<p><span class="s"><mark class="person">Ada Lovelace</mark> met </span><b><span class="s">Charles Bab</span></b>' +
      '<span class="s">bage in <mark class="place" data-id="Q84">London</mark>.</span></p><p>They wrote &amp; published notes.</p>',
    );
  });

  it('splits overlapping ranges into valid nesting', () => {
    expect(annotate('<p>abcdefgh</p>', [{ start: 0, end: 5, tag: 'i' }, { start: 3, end: 8, tag: 'u' }]))
      .toBe('<p><i>abc<u>de</u></i><u>fgh</u></p>');
  });

  it('accepts ranges in any order', () => {
    const a = annotate('<p>one two three</p>', [{ start: 8, end: 13 }, { start: 0, end: 3 }]);
    expect(a).toBe('<p><mark>one</mark> two <mark>three</mark></p>');
  });

  it('maps ranges that cross a separator to the text on each side', () => {
    expect(annotate(html, [at('London.\nThey')], { separator: '\n' }))
      .toBe('<p>Ada Lovelace met <b>Charles Bab</b>bage in <mark>London.</mark></p><p><mark>They</mark> wrote &amp; published notes.</p>');
  });

  it('uses offsets without a separator by default', () => {
    const t = text(html);
    const start = t.indexOf('London.They');
    expect(annotate(html, [{ start, end: start + 11 }]))
      .toBe('<p>Ada Lovelace met <b>Charles Bab</b>bage in <mark>London.</mark></p><p><mark>They</mark> wrote &amp; published notes.</p>');
  });

  it('skips hidden content when counting offsets', () => {
    expect(annotate('<style>p{}</style><p>Hi there</p>', [{ start: 3, end: 8 }]))
      .toBe('<style>p{}</style><p>Hi <mark>there</mark></p>');
  });

  it('applies default markup and merges attributes', () => {
    expect(annotate('<p>a b</p>', [{ start: 0, end: 1, attributes: { title: 'x' } }, { start: 2, end: 3, className: 'own' }], {
      tag: 'span', className: 'note', attributes: { 'data-k': '1' },
    })).toBe('<p><span class="note" data-k="1" title="x">a</span> <span class="own" data-k="1">b</span></p>');
  });

  it('clamps and ignores invalid ranges', () => {
    expect(annotate('<p>abc</p>', [{ start: -5, end: 1 }, { start: 2, end: 99 }, { start: 2, end: 2 }, { start: NaN, end: 1 }]))
      .toBe('<p><mark>a</mark>b<mark>c</mark></p>');
    expect(annotate('<p>abc</p>', [])).toBe('<p>abc</p>');
    expect(annotate('', [{ start: 0, end: 1 }])).toBe('');
    expect(annotate('<p></p>', [{ start: 0, end: 1 }])).toBe('<p></p>');
  });

  it('matches highlight() for the same ranges', () => {
    const t = text(html);
    const start = t.indexOf('Bab');
    expect(annotate(html, [{ start, end: start + 3 }])).toBe(highlight(html, 'Bab'));
  });

  it('works on a parsed document', () => {
    expect(parse('<p>abc</p>').annotate([{ start: 1, end: 2 }])).toBe('<p>a<mark>b</mark>c</p>');
  });
});
