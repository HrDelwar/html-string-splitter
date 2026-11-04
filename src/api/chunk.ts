import type { ChunkOptions, ChunkResult } from '../types.js';
import { toDoc, type DocCore, type HtmlInput } from '../engine/doc.js';
import { render, renderBalanced, SkipCursor } from '../engine/emit.js';
import type { AtomList, Heading } from '../engine/scan.js';
import { BOUNDARY_LEVEL, LVL_SENTENCE, LVL_WORD, docAtoms } from '../engine/scan.js';
import { headingId } from '../engine/sections.js';
import { resolveSpec } from '../engine/unit.js';
import { isPositive } from '../engine/util.js';

function chunkEnd(atoms: AtomList, a: number, size: number, level: number): number {
  const limit = atoms.cumBefore(a) + size;
  let b = atoms.lastWithin(limit);
  if (b < a) b = a;
  if (b >= atoms.n - 1 || level === 0) return b;
  for (let lvl = level; lvl >= LVL_WORD; lvl--) {
    for (let j = b; j >= a; j--) {
      if (atoms.level(j) >= lvl && !atoms.isWs(j) && !(lvl >= LVL_SENTENCE && atoms.inHeading(j))) {
        while (j + 1 < atoms.n && atoms.isWs(j + 1) && atoms.cum[j + 1] <= limit) j++;
        return j;
      }
    }
  }
  return b;
}

function nextStart(atoms: AtomList, a: number, b: number, overlap: number, level: number): number {
  let next = b + 1;
  if (overlap > 0) {
    const from = Math.max(a + 1, atoms.firstFrom(atoms.cum[b] - overlap));
    next = Math.min(next, from);
    if (level >= LVL_SENTENCE) {
      for (let j = next; j <= b; j++) {
        if (atoms.level(j - 1) >= level) {
          next = j;
          break;
        }
      }
    }
  }
  return next;
}

class HeadingTrail {
  private i = 0;
  private readonly stack: { h: Heading; id?: string }[] = [];
  constructor(private readonly doc: DocCore, private readonly headings: Heading[]) {}

  /** Headings enclosing `atom`, outermost first, and the nearest one's `id`. */
  at(atom: number): { headings: string[]; anchor?: string } {
    while (this.i < this.headings.length && this.headings[this.i].start <= atom) {
      const h = this.headings[this.i++];
      while (this.stack.length && this.stack[this.stack.length - 1].h.level >= h.level) this.stack.pop();
      this.stack.push({ h, id: headingId(this.doc, h) });
    }
    let anchor: string | undefined;
    for (let k = this.stack.length - 1; k >= 0 && !anchor; k--) anchor = this.stack[k].id;
    const headings = this.stack.map(e => e.h.text);
    return anchor ? { headings, anchor } : { headings };
  }
}

export function chunk(html: HtmlInput, options: ChunkOptions & { meta: true }): ChunkResult[];
export function chunk(html: HtmlInput, options: ChunkOptions): string[];
export function chunk(html: HtmlInput, options: ChunkOptions): string[] | ChunkResult[] {
  const doc = toDoc(html);
  if (!doc) return [];
  const { size, overlap = 0, breakAt, meta, stripComments } = options;
  if (!isPositive(size)) return [];
  if (overlap >= size) throw new Error('overlap must be less than size');

  const spec = resolveSpec(options);
  const atoms = docAtoms(doc, spec);
  if (atoms.total === 0) return [];
  const level = breakAt ? BOUNDARY_LEVEL[breakAt] ?? 0 : 0;
  const filters = { exclude: spec.exclude, stripComments, blockSeparator: '\n' };
  const trail = new HeadingTrail(doc, atoms.headings);
  const results: ChunkResult[] = [];

  if (atoms.total <= size) {
    const filtered = !!(spec.exclude || stripComments);
    const r = filtered || meta ? render(doc, undefined, undefined, filters) : null;
    results.push({ html: filtered ? r!.html : doc.html, text: r?.text ?? '', index: 0, start: 0, end: atoms.total, ...trail.at(0) });
  } else {
    const cursor = new SkipCursor({ ...filters, keepHidden: true });
    let a = 0;
    while (a < atoms.n) {
      const b = chunkEnd(atoms, a, size, level);
      const [from, to] = atoms.span(a, b);
      const r = renderBalanced(doc, from, to, { ...filters, keepHidden: true }, cursor);
      results.push({
        html: r.html,
        text: r.text,
        index: results.length,
        start: atoms.cumBefore(a),
        end: atoms.cum[b],
        ...trail.at(a),
      });
      if (b >= atoms.n - 1) break;
      a = nextStart(atoms, a, b, overlap, level);
    }
  }

  return meta ? results : results.map(r => r.html);
}
