export { split, count, chunk, text, splitAt, slice, clip, summary, find, wrap } from './api/index.js';
export { tokenize } from './parse/tokenizer.js';

export type {
  SplitOptions, SplitResult, CountOptions, ChunkOptions,
  SplitAtOptions, SliceOptions, TextOptions, SplitUnit,
  FindOptions, FindResult, WrapOptions, SummaryResult,
  Token, TokenType,
} from './types.js';

// ─── v1 backwards-compatible wrappers (deprecated) ────────────────

import { split, count } from './api/index.js';

/** @deprecated Use `split(html, { keep, by: 'character' })` instead */
export function splitByCharacterCount(html: string, charCount: number, btn?: string): string | null {
  if (!html || typeof html !== 'string' || charCount == null) return null;
  return split(html, { keep: charCount, by: 'character', suffix: btn ?? '' }).html || null;
}

/** @deprecated Use `split(html, { keep, by: 'word' })` instead */
export function splitByWordCount(html: string, wordCount: number, btn?: string): string | null {
  if (!html || typeof html !== 'string' || wordCount == null) return null;
  return split(html, { keep: wordCount, by: 'word', suffix: btn ?? '' }).html || null;
}

/** @deprecated Use `count(html, { by: 'character' })` instead */
export function getCharacterCount(html: string): number | null {
  if (!html || typeof html !== 'string') return null;
  return count(html, { by: 'character' });
}

/** @deprecated Use `count(html, { by: 'word' })` instead */
export function getWordCount(html: string): number | null {
  if (!html || typeof html !== 'string') return null;
  return count(html, { by: 'word' });
}
