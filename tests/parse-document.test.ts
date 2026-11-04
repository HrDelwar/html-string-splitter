import { describe, it, expect, vi } from 'vitest';
import { parse, HtmlDocument, split, count, chunk, clip, text, summary } from '../src/index.js';
import * as tokenizer from '../src/parse/tokenizer.js';
import { docAtoms } from '../src/engine/scan.js';

const html = '<h1>Title</h1><p>Hello <b>world</b>, this is a test.</p><p>Second paragraph here.</p>';

describe('parse()', () => {
  it('returns an HtmlDocument with tokens', () => {
    const doc = parse(html);
    expect(doc).toBeInstanceOf(HtmlDocument);
    expect(doc.html).toBe(html);
    expect(doc.tokens.length).toBeGreaterThan(0);
  });

  it('methods match the standalone functions', () => {
    const doc = parse(html);
    expect(doc.split({ keep: 10 })).toEqual(split(html, { keep: 10 }));
    expect(doc.clip({ keep: 3, by: 'w' })).toBe(clip(html, { keep: 3, by: 'w' }));
    expect(doc.count({ by: 'w' })).toBe(count(html, { by: 'w' }));
    expect(doc.chunk({ size: 4, by: 'w' })).toEqual(chunk(html, { size: 4, by: 'w' }));
    expect(doc.text()).toBe(text(html));
    expect(doc.summary()).toEqual(summary(html));
    expect(doc.splitAt({ at: 2, by: 'w' })).toHaveLength(2);
    expect(doc.slice({ start: 0, end: 5 })).toBe('<h1>Title</h1>');
    expect(doc.pick({ tag: 'p' })).toHaveLength(2);
    expect(doc.highlight('world')).toContain('<mark>world</mark>');
    expect(doc.wrap({ every: 1, by: 'p' })).toContain('<span>');
  });

  it('standalone functions accept a parsed document', () => {
    const doc = parse(html);
    expect(split(doc, { keep: 2, by: 'w' }).html).toBe(split(html, { keep: 2, by: 'w' }).html);
    expect(count(doc)).toBe(count(html));
  });

  it('tokenizes once across many calls', () => {
    const doc = parse(html);
    const spy = vi.spyOn(tokenizer, 'tokenize');
    doc.count({ by: 'w' });
    doc.clip({ keep: 3, by: 'w' });
    doc.chunk({ size: 3, by: 'w' });
    doc.summary();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('caches unit indexes per option set', () => {
    const doc = parse(html);
    const spec = { by: 'word', tag: null, imageWeight: 0 } as const;
    expect(docAtoms(doc, spec)).toBe(docAtoms(doc, spec));
    const measure = (s: string) => s.length;
    expect(doc.count({ measure })).toBe(doc.count({ measure }));
  });

  it('handles empty input', () => {
    const doc = parse('');
    expect(doc.count()).toBe(0);
    expect(doc.clip({ keep: 5 })).toBe('');
    expect(doc.chunk({ size: 5 })).toEqual([]);
  });
});
