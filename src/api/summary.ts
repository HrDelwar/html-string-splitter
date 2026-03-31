import type { SummaryResult } from '../types.js';
import { TokenType } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { decodeEntities, graphemeLength } from '../parse/entities.js';
import { textToUnits } from '../engine/counter.js';
import { updateNonVisibleDepth, BLOCK_ELEMENTS } from '../engine/visibility.js';

export function summary(html: string): SummaryResult {
  if (!html || typeof html !== 'string') {
    return { characters: 0, words: 0, sentences: 0, lines: 0, blocks: 0, tags: {} };
  }

  const tokens = tokenize(html);
  let characters = 0;
  let words = 0;
  let sentences = 0;
  let lines = 0;
  let blocks = 0;
  const tags: Record<string, number> = {};
  let nvDepth = 0;

  for (const token of tokens) {
    nvDepth = updateNonVisibleDepth(token, nvDepth);

    if (token.type === TokenType.OpenTag || token.type === TokenType.SelfClosingTag) {
      const name = token.tagName!;
      tags[name] = (tags[name] || 0) + 1;

      if (nvDepth === 0) {
        if (BLOCK_ELEMENTS.has(name)) {
          lines++;
          blocks++;
        }
        if (token.type === TokenType.SelfClosingTag && (name === 'br' || name === 'hr')) {
          lines++;
        }
      }
    }

    if (nvDepth > 0) continue;

    if (token.type === TokenType.Text && token.content) {
      const decoded = decodeEntities(token.content);
      characters += graphemeLength(decoded);
      const w = textToUnits(decoded, 'word');
      words += w.length;
      const s = textToUnits(decoded, 'sentence');
      if (s.length > 0) sentences += s.length;
    }
  }

  // If there were words but sentence splitter didn't trigger (no period etc.), count as 1
  if (words > 0 && sentences === 0) sentences = 1;

  return { characters, words, sentences, lines, blocks, tags };
}
