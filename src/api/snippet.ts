import type { SnippetOptions } from '../types.js';
import { endPos, startPos, toDoc, type HtmlInput } from '../engine/doc.js';
import { cmpPos, render, type Pos } from '../engine/emit.js';
import { PlainText } from '../engine/plain.js';
import type { AtomList } from '../engine/scan.js';
import { buildOpenTag } from '../engine/search.js';
import { resolveSpec } from '../engine/unit.js';

/** First atom that ends after `p`. */
function atomFrom(atoms: AtomList, p: Pos): number {
  let lo = 0;
  let hi = atoms.n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cmpPos(endPos(atoms, mid), p.ti, p.off) > 0) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** Last atom that starts before `p`. */
function atomUntil(atoms: AtomList, p: Pos): number {
  let lo = 0;
  let hi = atoms.n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cmpPos(startPos(atoms, mid)!, p.ti, p.off) < 0) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Build search-result excerpts around matches of `query`, with matches highlighted.
 *
 * @param html HTML string or parsed document
 * @param query Plain string (case-insensitive) or RegExp
 * @param options `radius` is the number of units kept on each side of a match
 * @return Valid HTML snippet, or '' when nothing matches
 */
export function snippet(html: HtmlInput, query: string | RegExp, options?: SnippetOptions): string {
  const doc = toDoc(html);
  if (!doc || !query) return '';
  const o = options ?? {};
  const radius = Math.max(0, o.radius ?? 10);
  const maxSnippets = Math.max(1, o.maxSnippets ?? 1);
  const ellipsis = o.ellipsis ?? '…';
  const separator = o.separator ?? ` ${ellipsis} `;

  const matches = new PlainText(doc).matches(query);
  if (matches.length === 0) return '';

  const atoms = doc.atoms(resolveSpec({ ...o, by: o.by ?? (o.measure ? undefined : 'word') }));
  if (atoms.n === 0) return '';

  const windows: [number, number][] = [];
  for (const m of matches) {
    const a = Math.max(0, atomFrom(atoms, m.mark.s) - radius);
    const b = Math.min(atoms.n - 1, atomUntil(atoms, m.mark.e) + radius);
    const last = windows[windows.length - 1];
    if (last && a <= last[1] + 1) {
      last[1] = Math.max(last[1], b);
    } else {
      if (windows.length === maxSnippets) break;
      windows.push([a, b]);
    }
  }

  const hl = o.highlight ?? true;
  const hlOpts = typeof hl === 'object' ? hl : {};
  const tag = hlOpts.tag ?? 'mark';
  const parts = windows.map(([a, b]) => {
    const r = render(doc.tokens, doc.decoded, startPos(atoms, a), endPos(atoms, b), {
      stripTags: o.stripTags,
      escapeText: o.stripTags && !!hl,
      marks: hl ? matches.map(m => m.mark) : undefined,
      markOpen: buildOpenTag(tag, hlOpts.className, hlOpts.attributes),
      markClose: `</${tag}>`,
    });
    return r.html + r.closers;
  });

  const lead = windows[0][0] > 0 ? ellipsis : '';
  const trail = windows[windows.length - 1][1] < atoms.n - 1 ? ellipsis : '';
  return lead + parts.join(separator) + trail;
}
