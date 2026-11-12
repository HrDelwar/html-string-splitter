import { describe, it, expect } from 'vitest';
import { split, clip, count, chunk } from '../src/index.js';

const approxTokens = (s: string) => Math.ceil(s.length / 4);

describe('measure', () => {
  it('weights words with a custom function', () => {
    const html = '<p>tiny enormous words</p>';
    expect(count(html, { measure: approxTokens })).toBe(1 + 2 + 2);
    const r = split(html, { keep: 4, measure: approxTokens });
    expect(r.html).toBe('<p>tiny enormous...</p>');
    expect(r.kept).toBe(3);
  });

  it('defaults to word granularity', () => {
    expect(count('<p>a b c</p>', { measure: () => 2 })).toBe(6);
  });

  it('can weight sentences', () => {
    const r = split('<p>One. Two two. Three three three.</p>', { keep: 3, by: 's', measure: s => s.split(' ').length });
    expect(r.html).toBe('<p>One. Two two....</p>');
  });

  it('chunks by measured budget', () => {
    const chunks = chunk('<p>aaaa bbbb cccc dddd</p>', { size: 2, measure: approxTokens });
    expect(chunks).toEqual(['<p>aaaa bbbb</p>', '<p>cccc dddd</p>']);
  });
});

describe('by: "byte"', () => {
  it('counts UTF-8 bytes of visible text', () => {
    expect(count('<p>héllo</p>', { by: 'byte' })).toBe(6);
    expect(count('<p>😀</p>', { by: 'byte' })).toBe(4);
    expect(count('<p>&amp;</p>', { by: 'byte' })).toBe(1);
  });

  it('never splits a multi-byte character', () => {
    const r = split('<p>aé😀b</p>', { keep: 4, by: 'byte' });
    expect(r.html).toBe('<p>aé...</p>');
    expect(r.kept).toBe(3);
  });
});

describe('maxOutputLength', () => {
  const html = '<p><b>Hello</b> <i>world</i> and more text here</p>';

  it('limits the final string, markup included', () => {
    for (const max of [10, 20, 30, 40]) {
      const out = clip(html, { maxOutputLength: max });
      expect(out.length).toBeLessThanOrEqual(max);
    }
  });

  it('keeps as much as fits', () => {
    expect(clip(html, { maxOutputLength: 30 })).toBe('<p><b>Hello</b> ...</p>');
    expect(clip(html, { maxOutputLength: 31 })).toBe('<p><b>Hello</b> <i>w...</i></p>');
  });

  it('returns the input untouched when it already fits', () => {
    expect(split(html, { maxOutputLength: 1000 })).toMatchObject({ html, truncated: false });
  });

  it('works together with keep and preserveWords', () => {
    const out = clip('<p>Hello wonderful world</p>', { keep: 100, maxOutputLength: 20, preserveWords: true });
    expect(out).toBe('<p>Hello...</p>');
  });

  it('includes suffix in the budget', () => {
    const out = clip(html, { maxOutputLength: 40, suffix: '<a href="/x">more</a>' });
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out).toContain('<a href="/x">more</a>');
  });

  it('applies to from: "end"', () => {
    const out = clip('<p>one two three four five</p>', { maxOutputLength: 20, from: 'end' });
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith('five</p>')).toBe(true);
  });

  it('returns empty when even the ellipsis does not fit', () => {
    expect(split(html, { maxOutputLength: 2 })).toMatchObject({ html: '', truncated: true });
  });
});

describe('locale word segmentation', () => {
  it('splits CJK text into words', () => {
    expect(count('<p>我喜欢学习中文</p>', { by: 'w' })).toBe(1);
    expect(count('<p>我喜欢学习中文</p>', { by: 'w', locale: 'zh' })).toBeGreaterThan(2);
  });

  it('truncates Japanese by word', () => {
    const out = clip('<p>私は日本語を勉強しています</p>', { keep: 2, by: 'w', locale: 'ja' });
    expect(out.startsWith('<p>私は')).toBe(true);
    expect(out.endsWith('...</p>')).toBe(true);
  });

  it('still joins Latin words split by tags', () => {
    expect(count('<p>un<b>believ</b>able day</p>', { by: 'w', locale: 'en' })).toBe(2);
  });
});
