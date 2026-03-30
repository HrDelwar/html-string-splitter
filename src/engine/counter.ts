import type { SplitUnit, Token } from '../types.js';
import { TokenType } from '../types.js';
import { graphemeLength } from '../parse/entities.js';
import { tokenize } from '../parse/tokenizer.js';

export function textToUnits(decoded: string, by: SplitUnit): string[] {
  switch (by) {
    case 'word':
      return decoded.split(/(\s+)/).filter(s => s.length > 0 && !/^\s+$/.test(s));
    case 'sentence':
      // Lookbehind skips common abbreviations (Mr., Dr., etc.) and single-letter abbrevs (U., A.)
      return decoded.split(/(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|inc|ltd|dept|approx|est|vol|no|viz)\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+(?=[A-Z\u00C0-\u024F])/).filter(s => s.length > 0);
    case 'character':
    default:
      return [];
  }
}

export function countUnits(decoded: string, by: SplitUnit): number {
  if (by === 'character') return graphemeLength(decoded);
  return textToUnits(decoded, by).length;
}

export function countByTag(html: string, tagName: string): number {
  const tokens = tokenize(html);
  let total = 0;
  for (const token of tokens) {
    if (token.type === TokenType.OpenTag && token.tagName === tagName) total++;
    if (token.type === TokenType.SelfClosingTag && token.tagName === tagName) total++;
  }
  return total;
}
