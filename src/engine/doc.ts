import type { Token } from '../types.js';
import { TokenType } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { decodeEntities } from '../parse/entities.js';
import { AtomList, CountSink, scanTokens } from './scan.js';
import type { Pos } from './emit.js';
import { specKey, type UnitSpec } from './unit.js';

/** Parsed HTML: tokens, decoded text and unit indexes are computed once and reused. */
export class DocCore {
  readonly html: string;
  readonly tokens: Token[];
  private decodedCache?: string[];
  private readonly atomCache = new Map<string, AtomList>();
  private readonly measureCache = new Map<(text: string) => number, Map<string, AtomList>>();

  constructor(html: string) {
    this.html = typeof html === 'string' ? html : '';
    this.tokens = tokenize(this.html);
  }

  get decoded(): string[] {
    if (!this.decodedCache) {
      this.decodedCache = this.tokens.map(t => (t.type === TokenType.Text && t.content ? decodeEntities(t.content) : ''));
    }
    return this.decodedCache;
  }

  atoms(spec: UnitSpec): AtomList {
    const key = specKey(spec);
    let cache = this.atomCache;
    if (spec.measure) {
      let m = this.measureCache.get(spec.measure);
      if (!m) {
        m = new Map();
        this.measureCache.set(spec.measure, m);
      }
      cache = m;
    }
    let atoms = cache.get(key);
    if (!atoms) {
      atoms = new AtomList();
      scanTokens(this.tokens, this.decoded, spec, atoms);
      cache.set(key, atoms);
    }
    return atoms;
  }

  countUnits(spec: UnitSpec): number {
    const cached = spec.measure ? this.measureCache.get(spec.measure)?.get(specKey(spec)) : this.atomCache.get(specKey(spec));
    if (cached) return cached.total;
    const sink = new CountSink();
    scanTokens(this.tokens, this.decoded, spec, sink);
    return sink.total;
  }
}

export type HtmlInput = string | DocCore;

export function toDoc(src: HtmlInput): DocCore | null {
  if (src instanceof DocCore) return src.html ? src : null;
  if (!src || typeof src !== 'string') return null;
  return new DocCore(src);
}

export function startPos(atoms: AtomList, i: number): Pos | undefined {
  return i < atoms.n ? { ti: atoms.sTi[i], off: atoms.sOff[i] } : undefined;
}

export function endPos(atoms: AtomList, i: number): Pos {
  return i >= 0 ? { ti: atoms.eTi[i], off: atoms.eOff[i] } : (startPos(atoms, 0) ?? { ti: 0, off: 0 });
}

/** Where output stops when atoms 0..k are kept. Tag units stop right before the next match. */
export function cutPos(atoms: AtomList, k: number, tagMode: boolean): Pos | undefined {
  if (k >= atoms.n - 1) return tagMode ? undefined : endPos(atoms, atoms.n - 1);
  return tagMode ? startPos(atoms, k + 1) : endPos(atoms, k);
}
