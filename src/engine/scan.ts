import type { BoundaryLevel, Token } from '../types.js';
import { TokenType } from '../types.js';
import { COMPLEX_TEXT, getGraphemeSegmenter, getWordSegmenter, utf8Length } from '../parse/entities.js';
import {
  ATOMIC_BLOCKS, BLOCK_ELEMENTS, HEADING_LEVEL, MEDIA_ELEMENTS, NON_VISIBLE_ELEMENTS,
  isTagToken, trackDepth, updateNonVisibleDepth,
} from './visibility.js';
import type { DocCore } from './doc.js';
import { specKey, type UnitSpec } from './unit.js';
import { firstIndex, type Pos } from './util.js';

export const LVL_WORD = 1;
export const LVL_SENTENCE = 2;
export const LVL_BLOCK = 3;
export const LVL_MASK = 3;
export const WS_ATOM = 4;

export const BOUNDARY_LEVEL: Record<BoundaryLevel, number> = { word: LVL_WORD, sentence: LVL_SENTENCE, block: LVL_BLOCK };

export interface AtomSink {
  atom(sTi: number, sOff: number, eTi: number, eOff: number, weight: number, flags: number): void;
  /** Raise the break level after the most recent atom. */
  mark(level: number): void;
  headingStart?(level: number, ti: number): void;
  headingText?(text: string): void;
  headingEnd?(ti: number): void;
}

export class CountSink implements AtomSink {
  total = 0;
  atom(_a: number, _b: number, _c: number, _d: number, weight: number): void { this.total += weight; }
  mark(): void {}
}

const MODE_CHAR = 0;
const MODE_BYTE = 1;
const MODE_WORD = 2;
const MODE_SENTENCE = 3;
const MODE_LINE = 4;
const MODE_TAG = 5;

const WORD_RUN = /\S+/g;
const WS_ONLY = /^\s+$/;
const TERMINATOR = /[.!?…。！？]/;
const CLOSER = /^["'”’)\]»]$/;
const SENTENCE_END = /[.!?…。！？]["'”’)\]»]*$/;
const ABBREVIATION = /^(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|inc|ltd|dept|approx|est|vol|no|viz)\.$/i;
const INITIAL = /^[A-Z]\.$/;
const SENTENCE_BREAK = /(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|inc|ltd|dept|approx|est|vol|no|viz)\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+(?=[A-ZÀ-ɏ])/g;
const WORDLIKE = /[\p{L}\p{N}]/u;
const NO_SPACE_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const LINE_CONTENT = new Set([...MEDIA_ELEMENTS, 'input', 'select', 'button']);

function isWsCode(c: number): boolean {
  return c === 32 || (c >= 9 && c <= 13) || c === 160;
}

function lastNonWs(d: string, from: number, to: number): number {
  for (let k = to - 1; k >= from; k--) {
    if (!isWsCode(d.charCodeAt(k)) && !WS_ONLY.test(d[k])) return k;
  }
  return -1;
}

function firstNonWs(d: string, from: number): number {
  for (let k = from; k < d.length; k++) {
    if (!isWsCode(d.charCodeAt(k)) && !WS_ONLY.test(d[k])) return k;
  }
  return -1;
}

/**
 * Walks tokens once and reports every unit as an atom with start/end positions.
 * Positions are (token index, offset into that token's decoded text).
 */
export class Scanner {
  private readonly mode: number;
  private exDepth = 0;
  private nvDepth = 0;
  private atomicDepth = 0;
  private headingDepth = 0;

  private open = false;
  private oSTi = 0;
  private oSOff = 0;
  private oETi = 0;
  private oEOff = 0;
  private oText = '';
  private readonly keepText: boolean;

  private prevNonWs = false;
  private prevTerm = false;
  private tail = '';
  private lineContent = false;

  constructor(private readonly spec: UnitSpec, private readonly sink: AtomSink) {
    const by = spec.by;
    this.mode = spec.tag ? MODE_TAG
      : by === 'byte' ? MODE_BYTE
      : by === 'word' ? MODE_WORD
      : by === 'sentence' ? MODE_SENTENCE
      : by === 'line' ? MODE_LINE
      : MODE_CHAR;
    this.keepText = !!spec.measure || (this.mode === MODE_WORD && !(sink instanceof CountSink));
  }

  token(tok: Token, ti: number, decoded: string): void {
    const type = tok.type;
    if (type === TokenType.Text) {
      if (this.exDepth > 0 || this.nvDepth > 0 || this.mode === MODE_TAG || !decoded) return;
      if (this.headingDepth > 0) this.sink.headingText?.(decoded);
      this.text(ti, decoded);
      return;
    }
    if (!isTagToken(tok)) return;

    const name = tok.tagName!;
    const exclude = this.spec.exclude;
    if (exclude?.has(name)) {
      this.exDepth = trackDepth(tok, exclude, this.exDepth);
      return;
    }
    if (this.exDepth > 0) return;

    if (this.mode === MODE_TAG) {
      if (name === this.spec.tag && type !== TokenType.CloseTag) this.sink.atom(ti, 0, ti + 1, 0, 1, LVL_BLOCK);
      return;
    }

    if (NON_VISIBLE_ELEMENTS.has(name)) {
      this.nvDepth = updateNonVisibleDepth(tok, this.nvDepth);
      return;
    }
    if (this.nvDepth > 0) return;

    const heading = HEADING_LEVEL[name];
    if (heading && type === TokenType.CloseTag && this.headingDepth > 0) {
      this.headingDepth--;
      if (this.headingDepth === 0) {
        this.boundary(name, type, ti);
        this.sink.headingEnd?.(ti);
        return;
      }
    }

    if (BLOCK_ELEMENTS.has(name)) this.boundary(name, type, ti);
    else if (type !== TokenType.CloseTag) this.inlineElement(name, ti);

    if (heading && type === TokenType.OpenTag) {
      if (this.headingDepth === 0) this.sink.headingStart?.(heading, ti);
      this.headingDepth++;
    }
  }

  finish(): void {
    this.endRun();
    this.sink.mark(LVL_BLOCK);
  }

  private boundary(name: string, type: TokenType, ti: number): void {
    this.endRun();
    const atomic = ATOMIC_BLOCKS.has(name);
    if (atomic && type === TokenType.CloseTag) this.atomicDepth = Math.max(0, this.atomicDepth - 1);
    this.sink.mark(this.atomicDepth > 0 ? LVL_WORD : LVL_BLOCK);
    if (atomic && type === TokenType.OpenTag) this.atomicDepth++;

    if (this.mode === MODE_LINE) {
      if (name === 'hr') {
        this.sink.atom(ti, 0, ti + 1, 0, 1, LVL_BLOCK);
      } else if (name === 'br' && !this.lineContent) {
        this.sink.atom(ti, 0, ti, 0, 1, LVL_BLOCK);
      }
      this.lineContent = false;
    }
  }

  private inlineElement(name: string, ti: number): void {
    if (this.spec.imageWeight && MEDIA_ELEMENTS.has(name)) {
      this.endRun();
      this.sink.atom(ti, 0, ti + 1, 0, this.spec.imageWeight, LVL_WORD);
      return;
    }
    if (this.mode === MODE_LINE && LINE_CONTENT.has(name)) {
      this.extendLine(ti, 0, ti + 1, 0);
    }
  }

  /** Close whatever unit is in progress at a hard boundary. */
  private endRun(): void {
    if (this.mode === MODE_CHAR || this.mode === MODE_BYTE) {
      if (this.prevNonWs) this.sink.mark(this.prevTerm ? LVL_SENTENCE : LVL_WORD);
      this.prevNonWs = false;
      this.prevTerm = false;
      return;
    }
    this.closeOpen();
    this.tail = '';
  }

  private openAt(sTi: number, sOff: number, eTi: number, eOff: number, text: string): void {
    this.open = true;
    this.oSTi = sTi;
    this.oSOff = sOff;
    this.oETi = eTi;
    this.oEOff = eOff;
    this.oText = this.keepText ? text : '';
  }

  private closeOpen(): void {
    if (!this.open) return;
    this.open = false;
    const text = this.oText;
    const weight = this.spec.measure && this.mode !== MODE_LINE ? this.spec.measure(text) : 1;
    let flags = LVL_WORD;
    if (this.mode === MODE_SENTENCE || this.mode === MODE_LINE) flags = this.mode === MODE_LINE ? LVL_BLOCK : LVL_SENTENCE;
    else if (text && SENTENCE_END.test(text) && !ABBREVIATION.test(text) && !INITIAL.test(text)) flags = LVL_SENTENCE;
    this.sink.atom(this.oSTi, this.oSOff, this.oETi, this.oEOff, weight, flags);
    this.oText = '';
  }

  private text(ti: number, d: string): void {
    switch (this.mode) {
      case MODE_CHAR:
      case MODE_BYTE:
        this.charText(ti, d);
        return;
      case MODE_WORD:
        if (this.spec.wordPattern) this.patternText(ti, d);
        else if (this.spec.locale) this.intlWordText(ti, d);
        else this.wordText(ti, d);
        return;
      case MODE_SENTENCE:
        this.sentenceText(ti, d);
        return;
      case MODE_LINE: {
        const f = firstNonWs(d, 0);
        if (f === -1) return;
        this.extendLine(ti, f, ti, lastNonWs(d, f, d.length) + 1);
      }
    }
  }

  private extendLine(sTi: number, sOff: number, eTi: number, eOff: number): void {
    if (!this.open) this.openAt(sTi, sOff, eTi, eOff, '');
    this.oETi = eTi;
    this.oEOff = eOff;
    this.lineContent = true;
  }

  private charText(ti: number, d: string): void {
    const sink = this.sink;
    const measure = this.spec.measure;
    const bytes = this.mode === MODE_BYTE;

    if (!measure && !COMPLEX_TEXT.test(d)) {
      if (sink instanceof CountSink) {
        sink.total += bytes ? utf8Length(d) : d.length;
        return;
      }
      for (let k = 0; k < d.length; k++) {
        const c = d.charCodeAt(k);
        const ws = isWsCode(c);
        if (ws && this.prevNonWs) sink.mark(this.prevTerm ? LVL_SENTENCE : LVL_WORD);
        sink.atom(ti, k, ti, k + 1, bytes && c >= 0x80 ? 2 : 1, ws ? WS_ATOM : 0);
        this.prevTerm = c === 46 || c === 33 || c === 63 || (this.prevTerm && (c === 34 || c === 39 || c === 41 || c === 93));
        this.prevNonWs = !ws;
      }
      return;
    }

    const seg = getGraphemeSegmenter();
    const parts = seg ? seg.segment(d) : [...d].map(segment => ({ segment, index: -1 }));
    let idx = 0;
    for (const part of parts) {
      const s = part.segment;
      const start = part.index >= 0 ? part.index : idx;
      idx = start + s.length;
      const ws = WS_ONLY.test(s);
      if (ws && this.prevNonWs) sink.mark(this.prevTerm ? LVL_SENTENCE : LVL_WORD);
      const weight = measure ? measure(s) : bytes ? utf8Length(s) : 1;
      sink.atom(ti, start, ti, idx, weight, ws ? WS_ATOM : 0);
      this.prevTerm = TERMINATOR.test(s) || (this.prevTerm && CLOSER.test(s));
      this.prevNonWs = !ws;
    }
  }

  private wordText(ti: number, d: string): void {
    if (this.open && WS_ONLY.test(d[0])) this.closeOpen();
    WORD_RUN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = WORD_RUN.exec(d)) !== null) {
      const a = m.index;
      const b = a + m[0].length;
      if (a === 0 && this.open) {
        this.oETi = ti;
        this.oEOff = b;
        if (this.keepText) this.oText += m[0];
      } else {
        this.closeOpen();
        this.openAt(ti, a, ti, b, m[0]);
      }
      if (b < d.length) this.closeOpen();
    }
  }

  private patternText(ti: number, d: string): void {
    const re = this.spec.wordPattern!;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(d)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      this.openAt(ti, m.index, ti, m.index + m[0].length, m[0]);
      this.closeOpen();
    }
  }

  private intlWordText(ti: number, d: string): void {
    const seg = getWordSegmenter(this.spec.locale!);
    if (!seg) {
      this.wordText(ti, d);
      return;
    }
    for (const part of seg.segment(d)) {
      if (!part.isWordLike) {
        this.closeOpen();
        continue;
      }
      const a = part.index;
      const b = a + part.segment.length;
      const prev = this.oText[this.oText.length - 1];
      const first = part.segment[0];
      if (a === 0 && this.open && prev && WORDLIKE.test(prev) && WORDLIKE.test(first)
        && !NO_SPACE_SCRIPT.test(prev) && !NO_SPACE_SCRIPT.test(first)) {
        this.oETi = ti;
        this.oEOff = b;
        this.oText += part.segment;
      } else {
        this.closeOpen();
        this.open = true;
        this.oSTi = ti;
        this.oSOff = a;
        this.oETi = ti;
        this.oEOff = b;
        this.oText = part.segment;
      }
    }
  }

  private sentenceText(ti: number, d: string): void {
    const ctx = this.tail;
    const combined = ctx + d;
    const starts: number[] = [];
    if (!this.open) {
      const f = firstNonWs(d, 0);
      if (f !== -1) starts.push(f);
    }
    SENTENCE_BREAK.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SENTENCE_BREAK.exec(combined)) !== null) {
      const st = m.index + m[0].length - ctx.length;
      if (st >= 0 && st < d.length && (starts.length === 0 || st > starts[starts.length - 1])) starts.push(st);
    }

    let pos = 0;
    for (const st of starts) {
      if (this.open) {
        const k = lastNonWs(d, pos, st);
        if (k !== -1) {
          this.oETi = ti;
          this.oEOff = k + 1;
          if (this.spec.measure) this.oText += d.slice(pos, k + 1);
        }
        this.closeOpen();
      }
      this.openAt(ti, st, ti, st + 1, '');
      pos = st;
    }
    if (this.open) {
      const k = lastNonWs(d, pos, d.length);
      if (k !== -1) {
        this.oETi = ti;
        this.oEOff = k + 1;
      }
      if (this.spec.measure) this.oText += d.slice(pos);
    }
    this.tail = combined.slice(-24);
  }
}

export interface Heading {
  level: number;
  text: string;
  /** Atom range of the heading text. */
  start: number;
  end: number;
  /** Token indexes of the opening and closing tag. */
  openTi: number;
  closeTi: number;
}

/** Atom index for one document and unit spec. */
export class AtomList implements AtomSink {
  /** Tag units cut right before the next match instead of after the last kept one. */
  constructor(readonly tagMode = false) {}

  n = 0;
  total = 0;
  readonly sTi: number[] = [];
  readonly sOff: number[] = [];
  readonly eTi: number[] = [];
  readonly eOff: number[] = [];
  readonly cum: number[] = [];
  readonly flags: number[] = [];
  readonly headings: Heading[] = [];
  private heading: Heading | null = null;

  atom(sTi: number, sOff: number, eTi: number, eOff: number, weight: number, flags: number): void {
    this.sTi.push(sTi);
    this.sOff.push(sOff);
    this.eTi.push(eTi);
    this.eOff.push(eOff);
    this.total += weight;
    this.cum.push(this.total);
    this.flags.push(flags);
    this.n++;
  }

  mark(level: number): void {
    if (this.n === 0) return;
    const i = this.n - 1;
    const f = this.flags[i];
    if ((f & LVL_MASK) < level) this.flags[i] = (f & ~LVL_MASK) | level;
  }

  headingStart(level: number, ti: number): void {
    this.heading = { level, text: '', start: this.n, end: this.n, openTi: ti, closeTi: ti };
  }

  headingText(text: string): void {
    if (this.heading) this.heading.text += text;
  }

  headingEnd(ti: number): void {
    const h = this.heading;
    if (!h) return;
    h.end = this.n;
    h.closeTi = ti;
    h.text = h.text.replace(/\s+/g, ' ').trim();
    if (h.text) this.headings.push(h);
    this.heading = null;
  }

  cumBefore(i: number): number {
    return i > 0 ? this.cum[i - 1] : 0;
  }

  level(i: number): number {
    return this.flags[i] & LVL_MASK;
  }

  isWs(i: number): boolean {
    return (this.flags[i] & WS_ATOM) !== 0;
  }

  /** Index of the last atom whose cumulative weight is <= limit, or -1. */
  lastWithin(limit: number): number {
    return firstIndex(0, this.n, i => this.cum[i] > limit) - 1;
  }

  /** Index of the first atom that starts at or after `units`. */
  firstFrom(units: number): number {
    return firstIndex(0, this.n, i => this.cumBefore(i) >= units);
  }

  inHeading(i: number): boolean {
    const hs = this.headings;
    const h = hs[firstIndex(0, hs.length, k => hs[k].start > i) - 1];
    return !!h && i < h.end;
  }

  start(i: number): Pos | undefined {
    return i < this.n ? { ti: this.sTi[i], off: this.sOff[i] } : undefined;
  }

  end(i: number): Pos {
    return i >= 0 ? { ti: this.eTi[i], off: this.eOff[i] } : (this.start(0) ?? { ti: 0, off: 0 });
  }

  /** Where output stops when atoms 0..k are kept. */
  cut(k: number): Pos | undefined {
    if (k >= this.n - 1) return this.tagMode ? undefined : this.end(this.n - 1);
    return this.tagMode ? this.start(k + 1) : this.end(k);
  }

  /** Render bounds for atoms a..b; undefined means the document edge. */
  span(a: number, b: number): [Pos | undefined, Pos | undefined] {
    return [a <= 0 ? undefined : this.start(a), b >= this.n - 1 ? undefined : this.cut(b)];
  }
}

export function scanTokens(tokens: Token[], decoded: string[], spec: UnitSpec, sink: AtomSink): void {
  const scanner = new Scanner(spec, sink);
  for (let ti = 0; ti < tokens.length; ti++) scanner.token(tokens[ti], ti, decoded[ti]);
  scanner.finish();
}

/** Unit index of a document for `spec`, built once and cached on the document. */
export function docAtoms(doc: DocCore, spec: UnitSpec): AtomList {
  const cache = doc.cacheFor(spec, true)!;
  const key = specKey(spec);
  let atoms = cache.get(key);
  if (!atoms) {
    atoms = new AtomList(!!spec.tag);
    scanTokens(doc.tokens, doc.decoded, spec, atoms);
    cache.set(key, atoms);
  }
  return atoms;
}

/** Total units of a document, reusing a cached index when one exists. */
export function docCount(doc: DocCore, spec: UnitSpec): number {
  const cached = doc.cacheFor(spec, false)?.get(specKey(spec));
  if (cached) return cached.total;
  const sink = new CountSink();
  scanTokens(doc.tokens, doc.decoded, spec, sink);
  return sink.total;
}
