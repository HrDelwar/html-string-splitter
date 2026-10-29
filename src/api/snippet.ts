import type { SnippetOptions } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { renderBalanced } from '../engine/emit.js';
import { PlainText } from '../engine/plain.js';
import { tagPair } from '../engine/search.js';
import { resolveSpec } from '../engine/unit.js';
import { cmpPos, firstIndex } from '../engine/util.js';

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
  const n = atoms.n;
  if (n === 0) return '';

  const windows: [number, number][] = [];
  for (const { mark } of matches) {
    const first = Math.min(n - 1, firstIndex(0, n, i => cmpPos(atoms.end(i), mark.s) > 0));
    const last = Math.max(0, firstIndex(0, n, i => cmpPos(atoms.start(i)!, mark.e) >= 0) - 1);
    const a = Math.max(0, first - radius);
    const b = Math.min(n - 1, last + radius);
    const prev = windows[windows.length - 1];
    if (prev && a <= prev[1] + 1) {
      prev[1] = Math.max(prev[1], b);
    } else {
      if (windows.length === maxSnippets) break;
      windows.push([a, b]);
    }
  }

  const hl = o.highlight ?? true;
  const [markOpen, markClose] = tagPair('mark', typeof hl === 'object' ? hl : undefined);
  const emit = {
    stripTags: o.stripTags,
    escapeText: o.stripTags && !!hl,
    marks: hl ? matches.map(m => m.mark) : undefined,
    markOpen,
    markClose,
  };
  const parts = windows.map(([a, b]) => renderBalanced(doc, atoms.start(a), atoms.end(b), emit).html);

  const lead = windows[0][0] > 0 ? ellipsis : '';
  const trail = windows[windows.length - 1][1] < n - 1 ? ellipsis : '';
  return lead + parts.join(separator) + trail;
}
