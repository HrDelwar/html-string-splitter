import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/index.js';

describe('tokenize() public API', () => {
  it('is exported from the package', () => {
    expect(typeof tokenize).toBe('function');
  });

  it('returns an array of tokens', () => {
    const tokens = tokenize('<p>Hello</p>');
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('tokens have type and raw properties', () => {
    const tokens = tokenize('<p>Hello</p>');
    for (const token of tokens) {
      expect(token).toHaveProperty('type');
      expect(token).toHaveProperty('raw');
      expect(typeof token.raw).toBe('string');
    }
  });

  it('tokenizes open tags, text, and close tags', () => {
    const tokens = tokenize('<p>Hello</p>');
    expect(tokens).toHaveLength(3);
    expect(tokens[0].tagName).toBe('p');
    expect(tokens[1].raw).toBe('Hello');
    expect(tokens[2].tagName).toBe('p');
  });

  it('handles self-closing tags', () => {
    const tokens = tokenize('Hello<br/>World<img src="x"/>');
    const selfClosing = tokens.filter(t => t.tagName === 'br' || t.tagName === 'img');
    expect(selfClosing).toHaveLength(2);
  });

  it('handles HTML comments', () => {
    const tokens = tokenize('<!-- comment --><p>Text</p>');
    expect(tokens[0].raw).toBe('<!-- comment -->');
  });

  it('handles nested elements', () => {
    const tokens = tokenize('<div><p><strong>Bold</strong></p></div>');
    const tagNames = tokens.filter(t => t.tagName).map(t => t.tagName);
    expect(tagNames).toContain('div');
    expect(tagNames).toContain('p');
    expect(tagNames).toContain('strong');
  });

  it('returns empty array for empty string', () => {
    const tokens = tokenize('');
    expect(tokens).toEqual([]);
  });

  it('handles plain text with no HTML', () => {
    const tokens = tokenize('Just plain text');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].raw).toBe('Just plain text');
    expect(tokens[0].content).toBe('Just plain text');
  });
});
