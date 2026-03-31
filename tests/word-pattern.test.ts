import { describe, it, expect } from 'vitest';
import { split } from '../src/index.js';

describe('split() with wordPattern', () => {
  it('default splits on whitespace', () => {
    const result = split('<p>Hello World</p>', { keep: 1, by: 'w' });
    expect(result.kept).toBe(1);
    expect(result.html).toContain('Hello');
    expect(result.html).not.toContain('World');
  });

  it('CJK text with Han script pattern treats each char as a word', () => {
    const cjk = '<p>你好世界测试</p>';
    const pattern = /[\p{Script=Han}]/gu;
    const result = split(cjk, { keep: 3, by: 'w', wordPattern: pattern });
    expect(result.kept).toBe(3);
    expect(result.truncated).toBe(true);
  });

  it('CJK text total reflects wordPattern count', () => {
    const cjk = '<p>你好世界测试</p>';
    const pattern = /[\p{Script=Han}]/gu;
    const result = split(cjk, { keep: 100, by: 'w', wordPattern: pattern });
    expect(result.total).toBe(6);
    expect(result.truncated).toBe(false);
  });

  it('mixed CJK and Latin text with wordPattern', () => {
    const mixed = '<p>Hello你好</p>';
    const pattern = /[\p{Script=Han}]|\b[a-zA-Z]+\b/gu;
    const result = split(mixed, { keep: 100, by: 'w', wordPattern: pattern });
    // Hello + 你 + 好 = 3
    expect(result.total).toBe(3);
  });

  it('default word count for CJK differs from pattern-based', () => {
    const cjk = '<p>你好世界</p>';
    const defaultResult = split(cjk, { keep: 100, by: 'w' });
    const patternResult = split(cjk, { keep: 100, by: 'w', wordPattern: /[\p{Script=Han}]/gu });
    // Per-character pattern gives 4, default treats continuous CJK differently
    expect(patternResult.total).toBe(4);
    expect(defaultResult.total).not.toBe(patternResult.total);
  });

  it('wordPattern with split truncation', () => {
    const html = '<p>one two three four five</p>';
    const pattern = /\b\w+\b/g;
    const result = split(html, { keep: 3, by: 'w', wordPattern: pattern });
    expect(result.kept).toBe(3);
    expect(result.truncated).toBe(true);
  });

  it('wordPattern does not affect character-based split', () => {
    const html = '<p>Hello World</p>';
    const result = split(html, { keep: 5, by: 'c', wordPattern: /\S+/g });
    expect(result.kept).toBe(5);
    expect(result.truncated).toBe(true);
  });
});
