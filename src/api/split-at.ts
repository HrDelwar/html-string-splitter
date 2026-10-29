import type { SplitAtOptions } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { renderBalanced } from '../engine/emit.js';
import { resolveSpec } from '../engine/unit.js';
import { isNonNegative } from '../engine/util.js';

export function splitAt(html: HtmlInput, options: SplitAtOptions): [string, string] {
  const doc = toDoc(html);
  if (!doc) return ['', ''];
  const at = options.at;
  if (!isNonNegative(at)) return ['', doc.html];

  const spec = resolveSpec(options);
  const atoms = doc.atoms(spec);
  if (at >= atoms.total) return [doc.html, ''];
  if (at === 0) return ['', doc.html];

  const k = atoms.lastWithin(at);
  const filters = { exclude: spec.exclude };
  const before = renderBalanced(doc, undefined, atoms.cut(k), filters);
  const after = renderBalanced(doc, atoms.start(k + 1), undefined, { ...filters, keepHidden: true });
  return [before.html, after.html];
}
