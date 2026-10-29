import type { Token } from '../types.js';
import { TokenType } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { decodeEntities } from '../parse/entities.js';
import { AtomList, CountSink, scanTokens } from './scan.js';
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
    const cache = this.cacheFor(spec, true)!;
    const key = specKey(spec);
    let atoms = cache.get(key);
    if (!atoms) {
      atoms = new AtomList(!!spec.tag);
      scanTokens(this.tokens, this.decoded, spec, atoms);
      cache.set(key, atoms);
    }
    return atoms;
  }

  /** Total units, reusing a cached index when one exists. */
  countUnits(spec: UnitSpec): number {
    const cached = this.cacheFor(spec, false)?.get(specKey(spec));
    if (cached) return cached.total;
    const sink = new CountSink();
    scanTokens(this.tokens, this.decoded, spec, sink);
    return sink.total;
  }

  private cacheFor(spec: UnitSpec, create: boolean): Map<string, AtomList> | undefined {
    if (!spec.measure) return this.atomCache;
    let cache = this.measureCache.get(spec.measure);
    if (!cache && create) {
      cache = new Map();
      this.measureCache.set(spec.measure, cache);
    }
    return cache;
  }
}

export type HtmlInput = string | DocCore;

export function toDoc(src: HtmlInput): DocCore | null {
  if (src instanceof DocCore) return src.html ? src : null;
  if (!src || typeof src !== 'string') return null;
  return new DocCore(src);
}
