import type { SplitAtOptions } from '../types.js';
import { cutPos, startPos, toDoc, type HtmlInput } from '../engine/doc.js';
import { render } from '../engine/emit.js';
import { resolveSpec } from '../engine/unit.js';

export function splitAt(html: HtmlInput, options: SplitAtOptions): [string, string] {
  const doc = toDoc(html);
  if (!doc) return ['', ''];
  const at = options.at;
  if (typeof at !== 'number' || at < 0 || !Number.isFinite(at)) return ['', doc.html];

  const spec = resolveSpec(options);
  const atoms = doc.atoms(spec);
  if (at >= atoms.total) return [doc.html, ''];
  if (at === 0) return ['', doc.html];

  const k = atoms.lastWithin(at);
  const filters = { exclude: spec.exclude };
  const before = render(doc.tokens, doc.decoded, undefined, cutPos(atoms, k, !!spec.tag), filters);
  const after = render(doc.tokens, doc.decoded, startPos(atoms, k + 1), undefined, { ...filters, keepHidden: true });
  return [before.html + before.closers, after.html + after.closers];
}
