import { describe, it, expect } from 'vitest';
import { decodeEntities, graphemeLength, graphemeSlice } from '../src/parse/entities.js';

describe('decodeEntities', () => {
  it('decodes named entities', () => {
    expect(decodeEntities('&amp;')).toBe('&');
    expect(decodeEntities('&lt;')).toBe('<');
    expect(decodeEntities('&gt;')).toBe('>');
    expect(decodeEntities('&quot;')).toBe('"');
    expect(decodeEntities('&nbsp;')).toBe('\u00A0');
    expect(decodeEntities('&copy;')).toBe('\u00A9');
  });

  it('decodes numeric entities', () => {
    expect(decodeEntities('&#169;')).toBe('\u00A9');
    expect(decodeEntities('&#65;')).toBe('A');
  });

  it('decodes hex entities', () => {
    expect(decodeEntities('&#x41;')).toBe('A');
    expect(decodeEntities('&#xA9;')).toBe('\u00A9');
    expect(decodeEntities('&#x1F600;')).toBe('\u{1F600}');
  });

  it('preserves unknown entities', () => {
    expect(decodeEntities('&unknown;')).toBe('&unknown;');
  });

  it('decodes multiple entities in a string', () => {
    expect(decodeEntities('A &amp; B &lt; C')).toBe('A & B < C');
  });

  it('handles strings without entities', () => {
    expect(decodeEntities('Hello world')).toBe('Hello world');
  });
});

describe('graphemeLength', () => {
  it('counts ASCII characters', () => {
    expect(graphemeLength('Hello')).toBe(5);
  });

  it('counts emoji as single graphemes', () => {
    expect(graphemeLength('😀')).toBe(1);
    expect(graphemeLength('Hello 😀')).toBe(7);
  });

  it('counts combined emoji as single graphemes', () => {
    expect(graphemeLength('👨‍👩‍👧‍👦')).toBe(1);
  });

  it('counts flag emoji as single graphemes', () => {
    expect(graphemeLength('🇺🇸')).toBe(1);
  });

  it('handles empty string', () => {
    expect(graphemeLength('')).toBe(0);
  });
});

describe('graphemeSlice', () => {
  it('slices ASCII strings', () => {
    expect(graphemeSlice('Hello', 0, 3)).toBe('Hel');
  });

  it('slices strings with emoji', () => {
    expect(graphemeSlice('Hi😀World', 0, 3)).toBe('Hi😀');
    expect(graphemeSlice('Hi😀World', 3)).toBe('World');
  });

  it('slices combined emoji correctly', () => {
    expect(graphemeSlice('A👨‍👩‍👧‍👦B', 0, 2)).toBe('A👨‍👩‍👧‍👦');
    expect(graphemeSlice('A👨‍👩‍👧‍👦B', 2)).toBe('B');
  });
});
