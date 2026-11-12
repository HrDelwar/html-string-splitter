import { describe, it, expect } from 'vitest';
import { repair, parse, clip } from '../src/index.js';

describe('repair()', () => {
  it.each([
    ['<p>Hello <b>world', '<p>Hello <b>world</b></p>'],
    ['<p>Hello <b>world</p><div>', '<p>Hello <b>world</b></p><div></div>'],
    ['<ul><li>one<li>two</ul>', '<ul><li>one</li><li>two</li></ul>'],
    ['<p>one<p>two', '<p>one</p><p>two</p>'],
    ['<p>one<div>two</div>', '<p>one</p><div>two</div>'],
    ['<dl><dt>a<dd>b</dl>', '<dl><dt>a</dt><dd>b</dd></dl>'],
    ['<select><option>a<option>b</select>', '<select><option>a</option><option>b</option></select>'],
    ['<table><tr><td>a<td>b<tr><td>c</table>', '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td></tr></table>'],
    ['<b><i>x</b>y</i>', '<b><i>x</i></b>y'],
  ])('balances %j', (input, expected) => {
    expect(repair(input)).toBe(expected);
  });

  it('drops end tags that close nothing', () => {
    expect(repair('<div>text</span> more</div></p>')).toBe('<div>text more</div>');
  });

  it('drops a tag cut off at the end of the input', () => {
    expect(repair('<p>Hello <a href="/x')).toBe('<p>Hello </p>');
    expect(repair('<p>Hello </')).toBe('<p>Hello </p>');
    expect(repair('<p>Hello <')).toBe('<p>Hello </p>');
    expect(repair('<p>x</p><!-')).toBe('<p>x</p>');
    expect(repair('<p>a &lt;')).toBe('<p>a &lt;</p>');
  });

  it('closes open comments, raw text and RCDATA elements', () => {
    expect(repair('<p>Hi</p><!-- note')).toBe('<p>Hi</p><!-- note-->');
    expect(repair('<script>let a = 1 < 2')).toBe('<script>let a = 1 < 2</script>');
    expect(repair('<textarea>abc')).toBe('<textarea>abc</textarea>');
  });

  it('leaves well-formed HTML unchanged', () => {
    const html = '<!DOCTYPE html><article><h1 id="t">A &amp; B</h1><p>a < b <br> c<img src="x.png"></p></article>';
    expect(repair(html)).toBe(html);
  });

  it('renders every prefix of streamed output as balanced HTML', () => {
    const html = '<article><h2>Title</h2><p>Some <b>bold</b> and <a href="/x">link</a> text.</p><ul><li>a<li>b</ul></article>';
    for (let i = 0; i <= html.length; i++) {
      const out = repair(html.slice(0, i));
      expect(repair(out)).toBe(out);
    }
    expect(repair(html)).toBe('<article><h2>Title</h2><p>Some <b>bold</b> and <a href="/x">link</a> text.</p><ul><li>a</li><li>b</li></ul></article>');
  });

  it('accepts a parsed document and handles empty input', () => {
    expect(repair(parse('<p>x'))).toBe('<p>x</p>');
    expect(repair('')).toBe('');
    expect(repair(null as unknown as string)).toBe('');
  });

  it('does not change other functions', () => {
    expect(clip('<p>Hello <b>world</p><p>more</p>', { keep: 100 })).toBe('<p>Hello <b>world</p><p>more</p>');
  });
});
