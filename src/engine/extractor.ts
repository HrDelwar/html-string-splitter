import type { Token } from '../types.js';
import { TokenType } from '../types.js';
import { updateNonVisibleDepth, BLOCK_ELEMENTS } from './visibility.js';

export function extractText(tokens: Token[], decoded: string[], separator?: string): string {
  let result = '';
  let nvd = 0;
  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];
    nvd = updateNonVisibleDepth(token, nvd);
    if (nvd > 0) continue;

    if (separator && result && (
      (token.type === TokenType.OpenTag || token.type === TokenType.SelfClosingTag) &&
      BLOCK_ELEMENTS.has(token.tagName!)
    )) {
      if (!result.endsWith(separator)) result += separator;
    }

    if (token.type === TokenType.Text) result += decoded[ti];
  }
  return result;
}
