import type { SplitOptions, SplitResult } from '../types.js';
import type { DocCore } from './doc.js';
import { cutPos, startPos } from './doc.js';
import { atBlockEnd, render, type EmitFilters } from './emit.js';
import type { AtomList } from './scan.js';
import type { UnitSpec } from './unit.js';

export interface CutContext {
  doc: DocCore;
  atoms: AtomList;
  spec: UnitSpec;
  ellipsis: string;
  suffix: string;
  filters: EmitFilters;
  smartEllipsis: boolean;
  wantText: boolean;
  charMode: boolean;
}

type CutOptions = Pick<SplitOptions, 'ellipsis' | 'suffix' | 'stripTags' | 'selectiveTags' | 'stripComments' | 'smartEllipsis' | 'output'>;

export function makeCutContext(doc: DocCore, spec: UnitSpec, o: CutOptions): CutContext {
  const tagMode = !!spec.tag;
  return {
    doc,
    atoms: doc.atoms(spec),
    spec,
    ellipsis: o.ellipsis ?? (tagMode ? '' : '...'),
    suffix: o.suffix ?? '',
    filters: {
      stripTags: o.stripTags ?? o.output === 'text',
      selectiveTags: o.selectiveTags ? new Set(o.selectiveTags.map(t => t.toLowerCase())) : undefined,
      stripComments: !!o.stripComments,
      exclude: spec.exclude,
    },
    smartEllipsis: !!o.smartEllipsis,
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
    const r = render(doc.tokens, doc.decoded, undefined, undefined, filters);
    if (filtered) result.html = r.html;
    if (ctx.wantText) result.text = r.text;
  }
  return result;
}

/** Keep atoms 0..k (k = -1 keeps none). */
export function cutHead(ctx: CutContext, k: number): SplitResult {
  const { doc, atoms } = ctx;
  const to = cutPos(atoms, k, !!ctx.spec.tag);
  const r = render(doc.tokens, doc.decoded, undefined, to, ctx.filters);
  let html = r.html;
  if (!(ctx.smartEllipsis && to && atBlockEnd(doc.tokens, doc.decoded, to))) html += ctx.ellipsis;
  html += ctx.suffix + r.closers;
  const result: SplitResult = { html, truncated: true, total: atoms.total, kept: k >= 0 ? atoms.cum[k] : 0 };
  if (ctx.wantText) result.text = r.text;
  return result;
}

/** Keep atoms s..n-1. */
export function cutTail(ctx: CutContext, s: number): SplitResult {
  const { doc, atoms } = ctx;
  const from = startPos(atoms, s);
  const result: SplitResult = { html: ctx.ellipsis + ctx.suffix, truncated: true, total: atoms.total, kept: 0 };
  if (!from) {
    if (ctx.wantText) result.text = '';
    return result;
  }
  const r = render(doc.tokens, doc.decoded, from, undefined, { ...ctx.filters, keepHidden: true });
  result.html += r.html + r.closers;
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
  const none: SplitResult = { html: '', truncated: true, total: atoms.total, kept: 0 };

  if (fromEnd) {
    let lo = Math.max(1, Math.min(n, tailStart(ctx, Math.min(keep, atoms.total), false)));
    let hi = n;
    if (cutTail(ctx, hi).html.length > max) return none;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cutTail(ctx, mid).html.length <= max) hi = mid;
      else lo = mid + 1;
    }
    let s = lo;
    if (preserveWords) {
      const adjusted = tailStart(ctx, atoms.total - atoms.cumBefore(s), preserveWords);
      if (adjusted >= s) s = adjusted;
    }
    return cutTail(ctx, s);
  }

  let lo = -1;
  let hi = Math.min(atoms.lastWithin(keep), n - 2);
  if (cutHead(ctx, -1).html.length > max) return none;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cutHead(ctx, mid).html.length <= max) lo = mid;
    else hi = mid - 1;
  }
  let k = lo;
  if (preserveWords && k >= 0) {
    const adjusted = headEnd(ctx, atoms.cum[k], preserveWords);
    if (adjusted <= k) k = adjusted;
  }
  return cutHead(ctx, k);
}
