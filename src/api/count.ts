import type { CountOptions, SplitUnit, Token } from '../types.js';
import { TokenType } from '../types.js';
import { decodeEntities } from '../parse/entities.js';
import { tokenize } from '../parse/tokenizer.js';
import { resolveUnit, isTagUnit } from '../engine/unit.js';
import { countUnits, countByTag } from '../engine/counter.js';
import { updateNonVisibleDepth } from '../engine/visibility.js';

/** Count from pre-tokenized tokens (avoids re-tokenizing) */
export function countFromTokens(tokens: Token[], by: SplitUnit): number {
  let total = 0;
  let nvDepth = 0;
  for (const token of tokens) {
    nvDepth = updateNonVisibleDepth(token, nvDepth);
    if (nvDepth === 0 && token.type === TokenType.Text && token.content) {
      total += countUnits(decodeEntities(token.content), by);
    }
  }
  return total;
}

export function count(html: string, options?: CountOptions): number {
  if (!html || typeof html !== 'string') return 0;

  const by = resolveUnit(options?.by);
  const tag = isTagUnit(by);
  if (tag) return countByTag(html, tag);

  return countFromTokens(tokenize(html), by);
}
