import type { TextOptions } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { PlainText } from '../engine/plain.js';

export function text(html: HtmlInput, options?: TextOptions): string {
  const doc = toDoc(html);
  if (!doc) return '';
  return new PlainText(doc, options?.separator).text;
}
