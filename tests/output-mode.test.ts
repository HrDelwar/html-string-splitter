import { describe, it, expect } from 'vitest';
import { split } from '../src/index.js';

describe('split() output mode', () => {
  const html = '<p>Hello <strong>World</strong></p>';

  it('defaults to html output with no text field', () => {
    const result = split(html, { keep: 100, by: 'c' });
    expect(result.html).toContain('<p>');
    expect(result.html).toContain('<strong>');
    expect(result.text).toBeUndefined();
  });

  it('output: "html" returns HTML with no text field', () => {
    const result = split(html, { keep: 100, by: 'c', output: 'html' });
    expect(result.html).toContain('<p>');
    expect(result.html).toContain('<strong>');
    expect(result.text).toBeUndefined();
  });

  it('output: "text" strips tags', () => {
    const result = split(html, { keep: 100, by: 'c', output: 'text' });
    expect(result.html).not.toContain('<p>');
    expect(result.html).not.toContain('<strong>');
    expect(result.html).toContain('Hello');
    expect(result.html).toContain('World');
  });

  it('output: "both" returns html and text fields', () => {
    const result = split(html, { keep: 100, by: 'c', output: 'both' });
    expect(result.html).toContain('<p>');
    expect(result.html).toContain('<strong>');
    expect(result.text).toBeDefined();
    expect(result.text).not.toContain('<p>');
    expect(result.text).toContain('Hello');
    expect(result.text).toContain('World');
  });

  it('output: "both" works with truncation', () => {
    const result = split(html, { keep: 5, by: 'c', output: 'both' });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('<');
    expect(result.text).toBeDefined();
    expect(typeof result.text).toBe('string');
  });

  it('output: "text" with truncation strips tags from truncated result', () => {
    const result = split('<p>Hello <em>beautiful</em> world</p>', {
      keep: 10,
      by: 'c',
      output: 'text',
    });
    expect(result.truncated).toBe(true);
    expect(result.html).not.toContain('<p>');
    expect(result.html).not.toContain('<em>');
  });
});
