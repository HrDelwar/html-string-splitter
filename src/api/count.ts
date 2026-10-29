import type { CountOptions } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { resolveSpec } from '../engine/unit.js';

export function count(html: HtmlInput, options?: CountOptions): number {
  const doc = toDoc(html);
  if (!doc) return 0;
  return doc.countUnits(resolveSpec(options));
}
