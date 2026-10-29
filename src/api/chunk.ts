import type { BoundaryLevel, ChunkOptions, ChunkResult } from '../types.js';
import { cutPos, startPos, toDoc, type HtmlInput } from '../engine/doc.js';
import { render, SkipCursor } from '../engine/emit.js';
import type { AtomList, Heading } from '../engine/scan.js';
import { LVL_BLOCK, LVL_SENTENCE, LVL_WORD } from '../engine/scan.js';
import { resolveSpec } from '../engine/unit.js';

const LEVELS: Record<BoundaryLevel, number> = { word: LVL_WORD, sentence: LVL_SENTENCE, block: LVL_BLOCK };

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
  private readonly stack: Heading[] = [];
  constructor(private readonly headings: Heading[]) {}

  at(atom: number): string[] {
    while (this.i < this.headings.length && this.headings[this.i].start <= atom) {
      const h = this.headings[this.i++];
      while (this.stack.length && this.stack[this.stack.length - 1].level >= h.level) this.stack.pop();
      this.stack.push(h);
    }
    return this.stack.map(h => h.text);
  }
}

export function chunk(html: HtmlInput, options: ChunkOptions & { meta: true }): ChunkResult[];
export function chunk(html: HtmlInput, options: ChunkOptions): string[];
export function chunk(html: HtmlInput, options: ChunkOptions): string[] | ChunkResult[] {
  const doc = toDoc(html);
  if (!doc) return [];
  const { size, overlap = 0, breakAt, meta, stripComments } = options;
  if (typeof size !== 'number' || size <= 0 || !Number.isFinite(size)) return [];
  if (overlap >= size) throw new Error('overlap must be less than size');

  const spec = resolveSpec(options);
  const atoms = doc.atoms(spec);
  if (atoms.total === 0) return [];
  const level = breakAt ? LEVELS[breakAt] ?? 0 : 0;
  const filters = { exclude: spec.exclude, stripComments };
  const trail = new HeadingTrail(atoms.headings);
  const results: ChunkResult[] = [];

  if (atoms.total <= size) {
    const filtered = !!(spec.exclude || stripComments);
    const r = filtered || meta ? render(doc.tokens, doc.decoded, undefined, undefined, filters) : null;
    results.push({ html: filtered ? r!.html : doc.html, text: r?.text ?? '', index: 0, start: 0, end: atoms.total, headings: trail.at(0) });
  } else {
    const cursor = new SkipCursor({ ...filters, keepHidden: true });
    let a = 0;
    while (a < atoms.n) {
      const b = chunkEnd(atoms, a, size, level);
      const from = a === 0 ? undefined : startPos(atoms, a);
      const to = b >= atoms.n - 1 ? undefined : cutPos(atoms, b, !!spec.tag);
      const r = render(doc.tokens, doc.decoded, from, to, { ...filters, keepHidden: true }, cursor);
      results.push({
        html: r.html + r.closers,
        text: r.text,
        index: results.length,
        start: atoms.cumBefore(a),
        end: atoms.cum[b],
        headings: trail.at(a),
      });
      if (b >= atoms.n - 1) break;
      a = nextStart(atoms, a, b, overlap, level);
    }
  }

  return meta ? results : results.map(r => r.html);
}
