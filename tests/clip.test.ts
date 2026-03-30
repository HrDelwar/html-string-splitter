import { describe, it, expect } from 'vitest';
import { clip, split } from '../src/index.js';

describe('clip()', () => {
  it('returns string directly', () => {
    const result = clip('<p>Hello world</p>', { keep: 5, by: 'c' });
    expect(typeof result).toBe('string');
    expect(result).toContain('Hello');
    expect(result).toContain('...');
  });

  it('returns same html as split().html', () => {
    const html = '<p>Hello <strong>beautiful</strong> world</p>';
    const opts = { keep: 10, by: 'w' as const };
    expect(clip(html, opts)).toBe(split(html, opts).html);
  });

  it('works with tag-based splitting', () => {
    const result = clip('<ul><li>A</li><li>B</li><li>C</li></ul>', { keep: 2, by: 'li' });
    expect(result).toContain('A');
    expect(result).toContain('B');
    expect(result).not.toContain('C');
  });

  it('works with from: end', () => {
    const result = clip('<p>Hello world</p>', { keep: 5, by: 'c', from: 'end' });
    expect(result).toContain('world');
    expect(result.startsWith('...')).toBe(true);
  });

  it('returns empty string for invalid input', () => {
    expect(clip('', { keep: 5 })).toBe('');
    expect(clip(null as any, { keep: 5 })).toBe('');
  });

  it('returns full html when keep >= total', () => {
    expect(clip('<p>Hi</p>', { keep: 100 })).toBe('<p>Hi</p>');
  });
});
