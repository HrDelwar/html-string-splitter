import type { Token } from '../types.js';
import { TokenType } from '../types.js';
import { RAW_TEXT_ELEMENTS } from '../parse/tokenizer.js';

export const NON_VISIBLE_ELEMENTS = new Set([
  'head', 'title', 'template', 'colgroup', 'datalist',
]);

export const HIDDEN_ELEMENTS = new Set([...NON_VISIBLE_ELEMENTS, ...RAW_TEXT_ELEMENTS]);

export const BLOCK_ELEMENTS = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'details',
  'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
  'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);

export const MEDIA_ELEMENTS = new Set(['img', 'svg', 'video', 'audio', 'picture', 'canvas', 'iframe']);

export const ATOMIC_BLOCKS = new Set(['pre', 'table']);

export const HEADING_LEVEL: Record<string, number> = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };

export function isTagToken(token: Token): boolean {
  return token.type === TokenType.OpenTag || token.type === TokenType.CloseTag || token.type === TokenType.SelfClosingTag;
}

/** Nesting depth after `token`, counting only elements named in `names`. */
export function trackDepth(token: Token, names: Set<string>, depth: number): number {
  if (!token.tagName || !names.has(token.tagName)) return depth;
  if (token.type === TokenType.OpenTag) return depth + 1;
  if (token.type === TokenType.CloseTag) return Math.max(0, depth - 1);
  return depth;
}

export function updateNonVisibleDepth(token: Token, depth: number): number {
  return trackDepth(token, NON_VISIBLE_ELEMENTS, depth);
}
