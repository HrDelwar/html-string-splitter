import type { SliceOptions } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { renderBalanced } from '../engine/emit.js';
import { resolveSpec } from '../engine/unit.js';

export function slice(html: HtmlInput, options?: SliceOptions): string {
  const doc = toDoc(html);
  if (!doc) return '';
  const spec = resolveSpec(options);
  const atoms = doc.atoms(spec);
  const total = atoms.total;

  let start = options?.start ?? 0;
  let end = options?.end ?? total;
  if (start < 0) start = Math.max(0, total + start);
  if (end < 0) end = Math.max(0, total + end);
  end = Math.min(end, total);
  if (start >= end || start >= total) return '';

  const a = atoms.firstFrom(start);
  const b = atoms.lastWithin(end);
  if (a > b) return '';
  if (a === 0 && b === atoms.n - 1 && !spec.exclude) return doc.html;

  const [from, to] = atoms.span(a, b);
  return renderBalanced(doc, from, to, { exclude: spec.exclude, keepHidden: true }).html;
}
