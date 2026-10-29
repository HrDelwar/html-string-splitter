import { describe, it, expect } from 'vitest';
import { tokenize, TokenType, count } from '../src/index.js';
import { Tokenizer } from '../src/parse/tokenizer.js';
import { decodeEntities, rawOffset } from '../src/parse/entities.js';

describe('tokenizer robustness', () => {
  it('emits doctype as a directive token', () => {
    const tokens = tokenize('<!DOCTYPE html><p>Hi</p>');
    expect(tokens[0]).toEqual({ type: TokenType.Directive, raw: '<!DOCTYPE html>' });
    expect(tokens[1].tagName).toBe('p');
  });

  it('handles processing instructions and CDATA', () => {
    const tokens = tokenize('<?xml version="1.0"?><![CDATA[a > b]]>x');
    expect(tokens.map(t => t.type)).toEqual([TokenType.Directive, TokenType.Directive, TokenType.Text]);
    expect(tokens[1].raw).toBe('<![CDATA[a > b]]>');
  });

  it('treats a bare < as text', () => {
    const tokens = tokenize('<p>a < b and c > d</p>');
    expect(tokens).toHaveLength(3);
    expect(tokens[1]).toMatchObject({ type: TokenType.Text, content: 'a < b and c > d' });
  });

  it('treats </ followed by a non-letter as text', () => {
    const tokens = tokenize('1 </ 2');
    expect(tokens).toEqual([{ type: TokenType.Text, raw: '1 </ 2', content: '1 </ 2' }]);
  });

  it('reads textarea and title content as text, not tags', () => {
    const tokens = tokenize('<textarea><b>x</b></textarea>');
    expect(tokens[1]).toMatchObject({ type: TokenType.Text, content: '<b>x</b>' });
    expect(tokens[2]).toMatchObject({ type: TokenType.CloseTag, tagName: 'textarea' });
  });

  it('matches raw-text close tags case-insensitively', () => {
    const tokens = tokenize('<script>if (a<b) x()</SCRIPT ><p>ok</p>');
    expect(tokens[1]).toMatchObject({ type: TokenType.RawContent, raw: 'if (a<b) x()' });
    expect(tokens[2]).toMatchObject({ type: TokenType.CloseTag, tagName: 'script', raw: '</SCRIPT >' });
    expect(tokens[3].tagName).toBe('p');
  });

  it('strips attributes from close tag names', () => {
    expect(tokenize('</div class="x">')[0].tagName).toBe('div');
  });

  it('exposes TokenType at runtime', () => {
    expect(TokenType.Text).toBe(3);
    expect(tokenize('hi')[0].type === TokenType.Text).toBe(true);
  });
});

describe('incremental Tokenizer', () => {
  it('produces the same tokens as tokenize() across arbitrary chunk splits', () => {
    const html = '<!DOCTYPE html><div class="a>b">Hello &amp; <b>world</b><!-- c --><script>x<y</script>tail</div>';
    const whole = tokenize(html).map(t => t.raw).join('');
    for (let size = 1; size <= 7; size++) {
      const t = new Tokenizer();
      let raw = '';
      for (let i = 0; i < html.length; i += size) raw += t.write(html.slice(i, i + size)).map(x => x.raw).join('');
      raw += t.end().map(x => x.raw).join('');
      expect(raw).toBe(whole);
    }
  });

  it('does not split entities across chunks', () => {
    const t = new Tokenizer();
    const first = t.write('a &am');
    expect(first.map(x => x.raw).join('')).toBe('a ');
    expect(t.write('p; b').map(x => x.raw).join('')).toBe('&amp; b');
  });
});

describe('entities', () => {
  it('decodes the Latin-1 run at the right code points', () => {
    expect(decodeEntities('&nbsp;&times;&divide;&yuml;')).toBe(' ×÷ÿ');
  });

  it('decodes Greek, math and common HTML5 entities', () => {
    expect(decodeEntities('&alpha;&Omega;&check;&rarr;&le;&hellip;')).toBe('αΩ✓→≤…');
  });

  it('counts named entities as one character', () => {
    expect(count('<p>&hearts;&alpha;&check;</p>')).toBe(3);
  });

  it('replaces invalid code points instead of throwing', () => {
    expect(decodeEntities('&#99999999;&#0;&#xD800;')).toBe('���');
    expect(() => count('<p>&#99999999;</p>')).not.toThrow();
  });

  it('remaps C1 numeric references like browsers', () => {
    expect(decodeEntities('&#150;&#146;')).toBe('–’');
  });

  it('leaves unknown entities untouched', () => {
    expect(decodeEntities('&bogus; &#ab;')).toBe('&bogus; &#ab;');
  });

  it('maps decoded offsets back to raw offsets', () => {
    const raw = 'A &amp; B &unknown; C';
    expect(rawOffset(raw, 3)).toBe(7);
    expect(rawOffset(raw, 2)).toBe(2);
    expect(raw.slice(0, rawOffset(raw, 11))).toBe('A &amp; B &unkn');
  });
});
