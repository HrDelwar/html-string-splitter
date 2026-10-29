import type { TextOptions } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { extractText } from '../engine/extractor.js';

export function text(html: HtmlInput, options?: TextOptions): string {
  const doc = toDoc(html);
  if (!doc) return '';
  return extractText(doc.tokens, options?.separator);
}
