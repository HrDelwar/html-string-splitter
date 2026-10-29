import type { SplitOptions, SplitResult } from '../types.js';
import type { DocCore } from './doc.js';
import { atBlockEnd, render, renderBalanced, type EmitFilters } from './emit.js';
import type { AtomList } from './scan.js';
import type { UnitSpec } from './unit.js';
import { firstIndex, toTagSet } from './util.js';

export type OutputSettings = Pick<SplitOptions, 'ellipsis' | 'suffix' | 'stripTags' | 'selectiveTags' | 'stripComments' | 'smartEllipsis' | 'output'>;

export interface ResolvedOutput {
  ellipsis: string;
  suffix: string;
  filters: EmitFilters;
  smartEllipsis: boolean;
}

export interface CutContext extends ResolvedOutput {
  doc: DocCore;
  atoms: AtomList;
  spec: UnitSpec;
  wantText: boolean;
  charMode: boolean;
}

/** Defaults shared by every truncating API, batch or streaming. */
export function resolveOutput(spec: UnitSpec, o: OutputSettings): ResolvedOutput {
  return {
    ellipsis: o.ellipsis ?? (spec.tag ? '' : '...'),
    suffix: o.suffix ?? '',
    filters: {
      stripTags: o.stripTags ?? o.output === 'text',
      selectiveTags: toTagSet(o.selectiveTags),
      stripComments: !!o.stripComments,
      exclude: spec.exclude,
    },
    smartEllipsis: !!o.smartEllipsis,
  };
}

export function makeCutContext(doc: DocCore, spec: UnitSpec, o: OutputSettings): CutContext {
  return {
    ...resolveOutput(spec, o),
    doc,
    atoms: doc.atoms(spec),
    spec,
    wantText: o.output === 'both',
    charMode: spec.by === 'character' || spec.by === 'byte',
  };
}

export function fullResult(ctx: CutContext): SplitResult {
  const { doc, atoms, filters } = ctx;
  const total = atoms.total;
  const filtered = !!(filters.exclude || filters.stripTags || filters.stripComments);
  const result: SplitResult = { html: doc.html, truncated: false, total, kept: total };
  if (filtered || ctx.wantText) {
    const r = render(doc, undefined, undefined, filters);
    if (filtered) result.html = r.html;
    if (ctx.wantText) result.text = r.text;
  }
  return result;
}

/** Keep atoms 0..k (k = -1 keeps none). */
export function cutHead(ctx: CutContext, k: number): SplitResult {
  const { doc, atoms } = ctx;
  const to = atoms.cut(k);
  const r = render(doc, undefined, to, ctx.filters);
  let html = r.html;
  if (!(ctx.smartEllipsis && to && atBlockEnd(doc, to))) html += ctx.ellipsis;
  html += ctx.suffix + r.closers;
  const result: SplitResult = { html, truncated: true, total: atoms.total, kept: k >= 0 ? atoms.cum[k] : 0 };
  if (ctx.wantText) result.text = r.text;
  return result;
}

/** Keep atoms s..n-1. */
export function cutTail(ctx: CutContext, s: number): SplitResult {
  const { doc, atoms } = ctx;
  const from = atoms.start(s);
  const result: SplitResult = { html: ctx.ellipsis + ctx.suffix, truncated: true, total: atoms.total, kept: 0 };
  if (!from) {
    if (ctx.wantText) result.text = '';
    return result;
  }
  const r = renderBalanced(doc, from, undefined, { ...ctx.filters, keepHidden: true });
  result.html += r.html;
  result.kept = atoms.total - atoms.cumBefore(s);
  if (ctx.wantText) result.text = r.text;
  return result;
}

function backtrackToWord(atoms: AtomList, k: number): number {
  let j = k - 1;
  while (j >= 0 && atoms.level(j) < 1) j--;
  while (j >= 0 && atoms.isWs(j)) j--;
  return j >= 0 ? j : k;
}

/** Last kept atom for `keep` units, honoring `preserveWords` in character mode. */
export function headEnd(ctx: CutContext, keep: number, preserveWords: SplitOptions['preserveWords']): number {
  const { atoms } = ctx;
  let k = atoms.lastWithin(keep);
  if (!preserveWords || !ctx.charMode || k < 0 || k >= atoms.n - 1) return k;

  if (atoms.isWs(k)) {
    while (k > 0 && atoms.isWs(k)) k--;
    return k;
  }
  if (atoms.level(k) >= 1) return k;

  if (typeof preserveWords === 'number' && preserveWords > 0) {
    const limit = keep + preserveWords;
    let j = k + 1;
    while (j < atoms.n && atoms.cum[j] <= limit && atoms.level(j) < 1 && !atoms.isWs(j)) j++;
    if (j < atoms.n && atoms.cum[j] <= limit && atoms.level(j) >= 1) return j;
  }
  return backtrackToWord(atoms, k);
}

/** First kept atom when keeping the last `keep` units. */
export function tailStart(ctx: CutContext, keep: number, preserveWords: SplitOptions['preserveWords']): number {
  const { atoms } = ctx;
  let s = atoms.firstFrom(atoms.total - keep);
  if (!preserveWords || !ctx.charMode || s <= 0 || s >= atoms.n) return s;
  const original = s;
  if (!atoms.isWs(s) && !atoms.isWs(s - 1) && atoms.level(s - 1) < 1) {
    while (s < atoms.n && atoms.level(s - 1) < 1) s++;
  }
  while (s < atoms.n && atoms.isWs(s)) s++;
  return s < atoms.n ? s : original;
}

/** Largest result whose html fits in `max` characters. */
export function fitOutput(ctx: CutContext, keep: number, max: number, fromEnd: boolean, preserveWords: SplitOptions['preserveWords']): SplitResult {
  const { atoms } = ctx;
  const n = atoms.n;
  const fits = (r: SplitResult) => r.html.length <= max;

  if (fromEnd) {
    if (!fits(cutTail(ctx, n))) return { html: '', truncated: true, total: atoms.total, kept: 0 };
    const lo = Math.max(1, Math.min(n, tailStart(ctx, Math.min(keep, atoms.total), false)));
    let s = firstIndex(lo, n, i => fits(cutTail(ctx, i)));
    if (preserveWords) s = Math.max(s, tailStart(ctx, atoms.total - atoms.cumBefore(s), preserveWords));
    return cutTail(ctx, s);
  }

  if (!fits(cutHead(ctx, -1))) return { html: '', truncated: true, total: atoms.total, kept: 0 };
  const hi = Math.min(atoms.lastWithin(keep), n - 2);
  let k = firstIndex(0, hi + 1, i => !fits(cutHead(ctx, i))) - 1;
  if (preserveWords && k >= 0) k = Math.min(k, headEnd(ctx, atoms.cum[k], preserveWords));
  return cutHead(ctx, k);
}
