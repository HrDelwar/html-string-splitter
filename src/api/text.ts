import type { TextOptions } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { extractText } from '../engine/extractor.js';

export function text(html: string, options?: TextOptions): string {
  if (!html || typeof html !== 'string') return '';
  return extractText(tokenize(html), options?.separator);
}
