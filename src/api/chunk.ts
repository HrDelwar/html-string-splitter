import type { ChunkOptions } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { resolveUnit, isTagUnit } from '../engine/unit.js';
import { countByTag } from '../engine/counter.js';
import { splitFromTokens } from '../engine/truncator.js';
import { splitByTag, stripConsumedByTag } from '../engine/tag-truncator.js';
import { stripConsumed } from '../engine/skipper.js';
import { countFromTokens } from './count.js';

export function chunk(html: string, options: ChunkOptions): string[] {
  if (!html || typeof html !== 'string') return [];

  const { size, by: rawBy = 'character', overlap = 0, breakAt } = options;
  const by = resolveUnit(rawBy);
  if (typeof size !== 'number' || size <= 0 || !Number.isFinite(size)) return [];
  if (overlap >= size) throw new Error('overlap must be less than size');

  const tag = isTagUnit(by);
  const preserveWords = breakAt === 'word' ? ('trim' as const) : false;
  const advance = size - overlap;

  if (tag) {
    const total = countByTag(html, tag);
    if (total === 0) return [];
    if (total <= size) return [html];

    const chunks: string[] = [];
    let remaining = html;
    let offset = 0;
    while (offset < total) {
      const chunkSize = Math.min(size, total - offset);
      const result = splitByTag(remaining, chunkSize, tag, '', '');
      if (!result.html || result.kept === 0) break;
      chunks.push(result.html);
      const skip = Math.min(result.kept, advance);
      offset += skip;
      if (!result.truncated) break;
      remaining = stripConsumedByTag(remaining, skip, tag);
      if (!remaining) break;
    }
    return chunks;
  }

  // Text-based: tokenize once for first chunk, then smaller remainders
  let tokens = tokenize(html);
  const total = countFromTokens(tokens, by);
  if (total === 0) return [];
  if (total <= size) return [html];

  const chunks: string[] = [];
  let remaining = html;
  let offset = 0;

  while (offset < total) {
    const chunkSize = Math.min(size, total - offset);
    let result = splitFromTokens(tokens, remaining, {
      keep: chunkSize, by, ellipsis: '', suffix: '',
      preserveWords, stripTags: false,
    });
    if (preserveWords && result.kept === 0) {
      result = splitFromTokens(tokens, remaining, {
        keep: chunkSize, by, ellipsis: '', suffix: '',
        preserveWords: false, stripTags: false,
      });
    }
    if (!result.html || result.kept === 0) break;
    chunks.push(result.html);

    const actualKept = result.kept;
    const skip = Math.min(actualKept, advance);
    offset += skip;
    if (!result.truncated) break;

    remaining = stripConsumed(remaining, skip, by);
    if (!remaining) break;
    tokens = tokenize(remaining);
  }

  return chunks;
}
