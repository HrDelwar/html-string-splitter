import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/parse/tokenizer.js';
import { TokenType } from '../src/types.js';

describe('tokenizer', () => {
  it('tokenizes plain text', () => {
    const tokens = tokenize('Hello world');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TokenType.Text);
    expect(tokens[0].content).toBe('Hello world');
  });

  it('tokenizes a simple tag with text', () => {
    const tokens = tokenize('<p>Hello</p>');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toMatchObject({ type: TokenType.OpenTag, tagName: 'p' });
    expect(tokens[1]).toMatchObject({ type: TokenType.Text, content: 'Hello' });
    expect(tokens[2]).toMatchObject({ type: TokenType.CloseTag, tagName: 'p' });
  });

  it('tokenizes nested tags', () => {
    const tokens = tokenize('<div><p>Hello</p></div>');
    expect(tokens).toHaveLength(5);
    expect(tokens[0]).toMatchObject({ type: TokenType.OpenTag, tagName: 'div' });
    expect(tokens[1]).toMatchObject({ type: TokenType.OpenTag, tagName: 'p' });
    expect(tokens[2]).toMatchObject({ type: TokenType.Text, content: 'Hello' });
    expect(tokens[3]).toMatchObject({ type: TokenType.CloseTag, tagName: 'p' });
    expect(tokens[4]).toMatchObject({ type: TokenType.CloseTag, tagName: 'div' });
  });

  it('tokenizes self-closing tags', () => {
    const tokens = tokenize('Hello<br/>world');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toMatchObject({ type: TokenType.Text, content: 'Hello' });
    expect(tokens[1]).toMatchObject({ type: TokenType.SelfClosingTag, tagName: 'br' });
    expect(tokens[2]).toMatchObject({ type: TokenType.Text, content: 'world' });
  });

  it('recognizes void elements without explicit self-close', () => {
    const tokens = tokenize('<img src="test.jpg">');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ type: TokenType.SelfClosingTag, tagName: 'img' });
  });

  it('handles attributes with > in quotes', () => {
    const tokens = tokenize('<a title="a > b">link</a>');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toMatchObject({ type: TokenType.OpenTag, tagName: 'a' });
    expect(tokens[0].attributes).toContain('title="a > b"');
  });

  it('tokenizes HTML comments', () => {
    const tokens = tokenize('Hello<!-- comment -->world');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toMatchObject({ type: TokenType.Text, content: 'Hello' });
    expect(tokens[1]).toMatchObject({ type: TokenType.Comment, raw: '<!-- comment -->' });
    expect(tokens[2]).toMatchObject({ type: TokenType.Text, content: 'world' });
  });

  it('handles text before any tag', () => {
    const tokens = tokenize('Hello <p>world</p>');
    expect(tokens).toHaveLength(4);
    expect(tokens[0]).toMatchObject({ type: TokenType.Text, content: 'Hello ' });
    expect(tokens[1]).toMatchObject({ type: TokenType.OpenTag, tagName: 'p' });
  });

  it('handles empty string', () => {
    expect(tokenize('')).toHaveLength(0);
  });

  it('handles multiple attributes', () => {
    const tokens = tokenize('<a href="#" class="link" id="main">text</a>');
    expect(tokens[0].tagName).toBe('a');
    expect(tokens[0].attributes).toContain('href="#"');
    expect(tokens[0].attributes).toContain('class="link"');
  });

  it('handles unclosed comment', () => {
    const tokens = tokenize('Hello<!-- unclosed');
    expect(tokens).toHaveLength(2);
    expect(tokens[1].type).toBe(TokenType.Comment);
  });

  it('handles malformed unclosed tag', () => {
    const tokens = tokenize('Hello<p');
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ type: TokenType.Text, content: 'Hello' });
    expect(tokens[1]).toMatchObject({ type: TokenType.Text, content: '<p' });
  });
});
