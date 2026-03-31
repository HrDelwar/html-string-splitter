import { describe, it, expect } from 'vitest';
import { summary } from '../src/index.js';

describe('summary()', () => {
  it('returns correct counts for simple paragraph', () => {
    const result = summary('<p>Hello world.</p>');
    expect(result.characters).toBe(12);
    expect(result.words).toBe(2);
    expect(result.sentences).toBe(1);
    expect(result.blocks).toBe(1);
    expect(result.tags).toEqual({ p: 1 });
  });

  it('returns zeros for empty input', () => {
    const result = summary('');
    expect(result.characters).toBe(0);
    expect(result.words).toBe(0);
    expect(result.sentences).toBe(0);
    expect(result.lines).toBe(0);
    expect(result.blocks).toBe(0);
    expect(result.tags).toEqual({});
  });

  it('excludes non-visible elements from text counts', () => {
    const html = '<style>.x { color: red; }</style><p>Hello</p>';
    const result = summary(html);
    expect(result.characters).toBe(5);
    expect(result.words).toBe(1);
    expect(result.tags).toHaveProperty('style');
    expect(result.tags).toHaveProperty('p');
  });

  it('counts multiple tag types correctly', () => {
    const html = '<div><p>One</p><p>Two</p><span>Three</span></div>';
    const result = summary(html);
    expect(result.tags.div).toBe(1);
    expect(result.tags.p).toBe(2);
    expect(result.tags.span).toBe(1);
  });

  it('counts self-closing tags', () => {
    const html = '<p>Line one<br/>Line two</p><img src="x"/>';
    const result = summary(html);
    expect(result.tags.br).toBe(1);
    expect(result.tags.img).toBe(1);
  });

  it('counts multiple sentences', () => {
    const html = '<p>First sentence. Second sentence. Third one!</p>';
    const result = summary(html);
    expect(result.sentences).toBe(3);
  });

  it('counts words across multiple elements', () => {
    const html = '<p>Hello</p><p>World</p>';
    const result = summary(html);
    expect(result.words).toBe(2);
  });

  it('counts lines and blocks for block elements', () => {
    const html = '<div><p>Para one</p><p>Para two</p></div>';
    const result = summary(html);
    // div, p, p are all block elements
    expect(result.blocks).toBeGreaterThanOrEqual(3);
    expect(result.lines).toBeGreaterThanOrEqual(3);
  });

  it('handles script content without counting it as text', () => {
    const html = '<script>var x = 1;</script><p>Visible</p>';
    const result = summary(html);
    expect(result.characters).toBe(7); // "Visible"
    expect(result.words).toBe(1);
    expect(result.tags.script).toBe(1);
  });
});
