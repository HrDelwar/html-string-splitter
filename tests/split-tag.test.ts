import { describe, it, expect } from 'vitest';
import { split, count, splitAt, slice, chunk } from '../src/index.js';

// ─── Element-based (tag) counting & splitting ─────────────────────

describe('tag-based counting', () => {
  it('counts <p> elements', () => {
    expect(count('<p>One</p><p>Two</p><p>Three</p>', { by: 'p' })).toBe(3);
  });

  it('counts <li> elements', () => {
    expect(count('<ul><li>A</li><li>B</li><li>C</li></ul>', { by: 'li' })).toBe(3);
  });

  it('counts <img> (self-closing)', () => {
    expect(count('<p>Text</p><img src="a.jpg"><img src="b.jpg">', { by: 'img' })).toBe(2);
  });

  it('counts <tr> in table', () => {
    const html = '<table><tr><td>1</td></tr><tr><td>2</td></tr><tr><td>3</td></tr></table>';
    expect(count(html, { by: 'tr' })).toBe(3);
  });

  it('returns 0 for tag not found', () => {
    expect(count('<p>Hello</p>', { by: 'li' })).toBe(0);
  });

  it('returns 0 for empty input', () => {
    expect(count('', { by: 'p' })).toBe(0);
  });
});

describe('tag-based split', () => {
  const listHtml = '<ul><li>Apple</li><li>Banana</li><li>Cherry</li><li>Date</li><li>Elderberry</li></ul>';

  it('keeps first N elements', () => {
    const result = split(listHtml, { keep: 3, by: 'li' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(3);
    expect(result.html).toContain('Apple');
    expect(result.html).toContain('Cherry');
    expect(result.html).not.toContain('Date');
  });

  it('returns full HTML when keep >= total', () => {
    const result = split(listHtml, { keep: 100, by: 'li' });
    expect(result.truncated).toBe(false);
    expect(result.html).toBe(listHtml);
  });

  it('no ellipsis by default for element splitting', () => {
    const result = split(listHtml, { keep: 2, by: 'li' });
    expect(result.html).not.toContain('...');
  });

  it('ellipsis when explicitly set for element splitting', () => {
    const result = split(listHtml, { keep: 2, by: 'li', ellipsis: '...' });
    expect(result.html).toContain('...');
  });

  it('custom ellipsis', () => {
    const result = split(listHtml, { keep: 2, by: 'li', ellipsis: ' …' });
    expect(result.html).toContain(' …');
  });

  it('suffix after ellipsis', () => {
    const result = split(listHtml, { keep: 2, by: 'li', suffix: '<button>More</button>' });
    expect(result.html).toContain('<button>More</button>');
  });

  it('splits <p> elements', () => {
    const html = '<article><p>First para.</p><p>Second para.</p><p>Third para.</p></article>';
    const result = split(html, { keep: 2, by: 'p' });
    expect(result.kept).toBe(2);
    expect(result.html).toContain('First para');
    expect(result.html).toContain('Second para');
    expect(result.html).not.toContain('Third');
  });

  it('splits <tr> rows', () => {
    const html = '<table><tr><td>R1</td></tr><tr><td>R2</td></tr><tr><td>R3</td></tr></table>';
    const result = split(html, { keep: 2, by: 'tr' });
    expect(result.kept).toBe(2);
    expect(result.html).toContain('R1');
    expect(result.html).toContain('R2');
    expect(result.html).not.toContain('R3');
  });

  it('splits self-closing <img> tags', () => {
    const html = '<div><img src="1.jpg"><img src="2.jpg"><img src="3.jpg"></div>';
    const result = split(html, { keep: 2, by: 'img' });
    expect(result.kept).toBe(2);
    expect(result.html).toContain('1.jpg');
    expect(result.html).toContain('2.jpg');
    expect(result.html).not.toContain('3.jpg');
  });

  it('closes parent tags properly', () => {
    const result = split(listHtml, { keep: 2, by: 'li' });
    expect(result.html).toContain('</ul>');
  });

  it('handles keep: 0', () => {
    const result = split(listHtml, { keep: 0, by: 'li' });
    expect(result.html).toBe('');
    expect(result.truncated).toBe(true);
  });
});

describe('tag-based from: end', () => {
  it('keeps last N elements', () => {
    const html = '<ul><li>A</li><li>B</li><li>C</li><li>D</li></ul>';
    const result = split(html, { keep: 2, by: 'li', from: 'end' });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('C');
    expect(result.html).toContain('D');
    expect(result.html).not.toContain('A');
    expect(result.html).not.toContain('B');
  });

  it('no ellipsis at start by default for element splitting', () => {
    const html = '<p>One</p><p>Two</p><p>Three</p>';
    const result = split(html, { keep: 1, by: 'p', from: 'end' });
    expect(result.html).not.toContain('...');
    expect(result.html).toContain('Three');
  });
});

describe('tag-based splitAt', () => {
  it('splits list at element position', () => {
    const html = '<ul><li>A</li><li>B</li><li>C</li><li>D</li></ul>';
    const [before, after] = splitAt(html, { at: 2, by: 'li' });
    expect(before).toContain('A');
    expect(before).toContain('B');
    expect(after).toContain('C');
    expect(after).toContain('D');
  });
});

describe('tag-based slice', () => {
  it('extracts a range of elements', () => {
    const html = '<ul><li>A</li><li>B</li><li>C</li><li>D</li></ul>';
    const result = slice(html, { start: 1, end: 3, by: 'li' });
    expect(result).toContain('B');
    expect(result).toContain('C');
    expect(result).not.toContain('A');
    expect(result).not.toContain('D');
  });

  it('supports negative indices', () => {
    const html = '<p>One</p><p>Two</p><p>Three</p>';
    const result = slice(html, { start: -1, by: 'p' });
    expect(result).toContain('Three');
    expect(result).not.toContain('One');
  });
});

describe('tag-based chunk', () => {
  it('chunks list into groups', () => {
    const html = '<ul><li>A</li><li>B</li><li>C</li><li>D</li><li>E</li><li>F</li></ul>';
    const chunks = chunk(html, { size: 2, by: 'li' });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]).toContain('A');
    expect(chunks[0]).toContain('B');
  });
});
