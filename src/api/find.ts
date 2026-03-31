import type { FindOptions, FindResult } from '../types.js';
import { TokenType } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { decodeEntities } from '../parse/entities.js';
import { updateNonVisibleDepth } from '../engine/visibility.js';

export function find(html: string, query: string | RegExp, options?: FindOptions): FindResult[] {
  if (!html || typeof html !== 'string' || !query) return [];

  const tokens = tokenize(html);
  let plainText = '';
  let nvDepth = 0;

  // Single pass: build plain text from visible content
  for (const token of tokens) {
    nvDepth = updateNonVisibleDepth(token, nvDepth);
    if (nvDepth > 0) continue;
    if (token.type === TokenType.Text && token.content) {
      plainText += decodeEntities(token.content);
    }
  }

  if (!plainText) return [];

  const results: FindResult[] = [];
  const regex = typeof query === 'string'
    ? new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    : new RegExp(query.source, query.flags.includes('g') ? query.flags : query.flags + 'g');

  let match: RegExpExecArray | null;
  while ((match = regex.exec(plainText)) !== null) {
    results.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
    // Prevent infinite loop on zero-length matches
    if (match[0].length === 0) regex.lastIndex++;
  }

  return results;
}
