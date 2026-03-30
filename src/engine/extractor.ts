import type { Token } from '../types.js';
import { TokenType } from '../types.js';
import { decodeEntities } from '../parse/entities.js';
import { updateNonVisibleDepth, BLOCK_ELEMENTS } from './visibility.js';

export function extractText(tokens: Token[], separator?: string): string {
  let result = '';
  let nvd = 0;
  for (const token of tokens) {
    nvd = updateNonVisibleDepth(token, nvd);
    if (nvd > 0) continue;

    if (separator && result && (
      (token.type === TokenType.OpenTag || token.type === TokenType.SelfClosingTag) &&
      BLOCK_ELEMENTS.has(token.tagName!)
    )) {
      if (!result.endsWith(separator)) result += separator;
    }

    if (token.type === TokenType.Text && token.content) {
      result += decodeEntities(token.content);
    }
  }
  return result;
}
