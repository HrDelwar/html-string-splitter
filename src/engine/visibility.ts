import type { Token } from '../types.js';
import { TokenType } from '../types.js';

export const NON_VISIBLE_ELEMENTS = new Set([
  'head', 'title', 'template', 'colgroup', 'datalist',
]);

export const BLOCK_ELEMENTS = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'details',
  'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
  'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);

export function updateNonVisibleDepth(token: Token, depth: number): number {
  if (token.type === TokenType.OpenTag && NON_VISIBLE_ELEMENTS.has(token.tagName!)) {
    return depth + 1;
  }
  if (token.type === TokenType.CloseTag && NON_VISIBLE_ELEMENTS.has(token.tagName!)) {
    return Math.max(0, depth - 1);
  }
  return depth;
}
