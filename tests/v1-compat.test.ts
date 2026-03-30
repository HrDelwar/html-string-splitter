import { describe, it, expect } from 'vitest';
import { splitByCharacterCount, splitByWordCount, getCharacterCount, getWordCount } from '../src/index.js';

// ─── Deprecated v1 wrappers ──────────────────────────────────────

describe('v1 backwards compatibility', () => {
  const html = '<p>This is text</p>split by <a href="#">character</a><strong>length </strong><p>also more text </p>';

  it('splitByCharacterCount works', () => {
    const result = splitByCharacterCount(html, 15);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result!).toContain('...');
  });

  it('splitByWordCount works', () => {
    const result = splitByWordCount(html, 6);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result!).toContain('...');
  });

  it('getCharacterCount works', () => {
    const result = getCharacterCount(html);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });

  it('getWordCount works', () => {
    const result = getWordCount(html);
    expect(result).toBe(10);
  });

  it('splitByCharacterCount returns null for invalid input', () => {
    expect(splitByCharacterCount('', 5)).toBeNull();
    expect(splitByCharacterCount(null as any, 5)).toBeNull();
  });

  it('splitByWordCount with button', () => {
    const result = splitByWordCount(html, 3, '<button>More</button>');
    expect(result).toContain('<button>More</button>');
  });

  it('getCharacterCount returns null for invalid input', () => {
    expect(getCharacterCount('')).toBeNull();
  });

  it('getWordCount returns null for invalid input', () => {
    expect(getWordCount('')).toBeNull();
  });
});
