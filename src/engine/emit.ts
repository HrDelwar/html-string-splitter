import type { Token } from '../types.js';
import { TokenType } from '../types.js';
import { escapeHtml, rawOffset } from '../parse/entities.js';
import { BLOCK_ELEMENTS, HIDDEN_ELEMENTS, trackDepth, updateNonVisibleDepth } from './visibility.js';
import { cmpPos, isBlank, type Pos } from './util.js';

export type { Pos } from './util.js';

/** Anything holding tokens with their decoded text, e.g. a parsed document. */
export interface TokenSource {
  tokens: Token[];
  decoded: string[];
}

export interface Mark {
  s: Pos;
  e: Pos;
  open?: string;
  close?: string;
}

export interface EmitFilters {
  stripTags?: boolean;
  selectiveTags?: Set<string>;
  stripComments?: boolean;
  exclude?: Set<string>;
}

export interface EmitOptions extends EmitFilters {
  /** Re-emit hidden elements (style, script, head, ...) that precede `from`. */
  keepHidden?: boolean;
  /** Sorted by start, then by end descending; overlapping marks nest. */
  marks?: Mark[];
  markOpen?: string;
  markClose?: string;
  /** Escape decoded text when tags are stripped (needed once markup is mixed back in). */
  escapeText?: boolean;
  breaks?: Pos[];
  breakOpen?: string;
  breakClose?: string;
  /** Inserted into text output between blocks so their text doesn't run together. */
  blockSeparator?: string;
  /** Write end tags for implicitly closed elements, drop stray end tags, close open comments. */
  repair?: boolean;
}

interface OpenEntry {
  name: string;
  raw: string;
}

const CLOSES_P = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'div', 'dl', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
  'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'ul',
]);

export class Emitter {
  out = '';
  text = '';
  private readonly stack: OpenEntry[] = [];
  private exDepth = 0;
  private nvDepth = 0;
  private hiddenDepth = 0;
  private hiddenBuf = '';
  private hiddenOut = '';
  private mi = 0;
  private active: Mark[] = [];
  private opened: Mark[] = [];
  private bi = 0;
  private sepPending = false;
  private readonly plainStrip: boolean;

  constructor(private readonly o: EmitOptions) {
    this.plainStrip = !!o.stripTags && !o.selectiveTags;
  }

  /** Copy structural state into a fresh emitter with different options. */
  fork(o: EmitOptions): Emitter {
    const em = new Emitter(o);
    em.stack.push(...this.stack);
    em.exDepth = this.exDepth;
    em.nvDepth = this.nvDepth;
    em.hiddenOut = this.hiddenOut;
    return em;
  }

  /** Track structure for a token that precedes the emitted range. */
  skip(tok: Token): void {
    const name = tok.tagName;
    if (name && this.excluded(tok)) return;
    if (this.exDepth > 0) return;

    if (this.o.keepHidden) {
      const hidden = !!name && HIDDEN_ELEMENTS.has(name);
      if (this.hiddenDepth > 0 || (hidden && tok.type === TokenType.OpenTag)) {
        this.hiddenBuf += tok.raw;
        if (hidden && tok.type === TokenType.OpenTag) this.hiddenDepth++;
        else if (hidden && tok.type === TokenType.CloseTag) this.hiddenDepth--;
        if (this.hiddenDepth === 0) {
          this.hiddenOut += this.hiddenBuf;
          this.hiddenBuf = '';
        }
      }
    }
    this.track(tok);
  }

  /** Start output mid-document: re-emit preserved hidden elements and reopen ancestors. */
  begin(): void {
    this.hiddenBuf = '';
    this.hiddenDepth = 0;
    if (this.plainStrip) return;
    this.out += this.hiddenOut;
    this.out += this.reopen();
  }

  emit(tok: Token, ti: number, decoded: string, a: number, b: number): void {
    if (this.o.breaks) this.breaksAt(ti, 0);
    if (tok.tagName && this.excluded(tok)) return;
    if (this.exDepth > 0) return;
    if (this.o.blockSeparator && tok.tagName && BLOCK_ELEMENTS.has(tok.tagName)) this.sepPending = true;

    switch (tok.type) {
      case TokenType.OpenTag:
      case TokenType.CloseTag:
        this.out += this.track(tok) ?? '';
        return;
      case TokenType.SelfClosingTag:
        if (!this.stripped(tok.tagName!)) this.out += tok.raw;
        return;
      case TokenType.Comment:
        if (!this.o.stripComments && !this.plainStrip) {
          this.out += this.o.repair && !tok.raw.endsWith('-->') ? tok.raw + '-->' : tok.raw;
        }
        return;
      case TokenType.Directive:
      case TokenType.RawContent:
        if (!this.plainStrip) this.out += tok.raw;
        return;
      case TokenType.Text:
        if (this.nvDepth > 0) {
          if (!this.plainStrip) this.out += tok.raw;
          return;
        }
        this.emitText(tok.raw, ti, decoded, a, b);
    }
  }

  closers(): string {
    let s = '';
    for (let i = this.stack.length - 1; i >= 0; i--) s += `</${this.stack[i].name}>`;
    return s;
  }

  get depth(): number {
    return this.stack.length;
  }

  private emitText(raw: string, ti: number, d: string, a: number, b: number): void {
    const cursor = { raw: 0, decoded: 0 };
    let p = a;
    while (p < b) {
      if (this.o.breaks && p > a) {
        this.closeMarks();
        this.breaksAt(ti, p);
      }
      let q = b;

      if (this.o.breaks) {
        const br = this.o.breaks[this.bi];
        if (br && br.ti === ti && br.off > p && br.off < q) q = br.off;
      }
      if (this.o.marks) q = this.markSpan(ti, p, q);

      const s = d.slice(p, q);
      this.separate();
      this.text += s;
      if (this.o.marks) this.openMarks();
      if (this.plainStrip) {
        this.out += this.o.escapeText ? escapeHtml(s) : s;
      } else {
        const r0 = rawOffset(raw, p, cursor);
        this.out += raw.slice(r0, rawOffset(raw, q, cursor));
      }
      p = q;
    }
    this.closeMarks();
  }

  /** Update the marks covering offset `p` of token `ti`; returns where that set next changes. */
  private markSpan(ti: number, p: number, q: number): number {
    const marks = this.o.marks!;
    const here = { ti, off: p };
    if (this.active.length) this.active = this.active.filter(m => cmpPos(m.e, here) > 0);
    while (this.mi < marks.length && cmpPos(marks[this.mi].s, here) <= 0) {
      const m = marks[this.mi++];
      if (cmpPos(m.e, here) > 0) this.active.push(m);
    }
    const next = marks[this.mi];
    if (next && next.s.ti === ti && next.s.off < q) q = next.s.off;
    for (const m of this.active) if (m.e.ti === ti && m.e.off < q) q = m.e.off;
    return q;
  }

  private openMarks(): void {
    const { active, opened } = this;
    let k = 0;
    while (k < opened.length && k < active.length && opened[k] === active[k]) k++;
    for (let j = opened.length - 1; j >= k; j--) this.out += opened[j].close ?? this.o.markClose!;
    for (let j = k; j < active.length; j++) this.out += active[j].open ?? this.o.markOpen!;
    this.opened = active.slice();
  }

  private closeMarks(): void {
    const opened = this.opened;
    if (!opened.length) return;
    for (let j = opened.length - 1; j >= 0; j--) this.out += opened[j].close ?? this.o.markClose!;
    this.opened = [];
  }

  private separate(): void {
    if (!this.sepPending) return;
    this.sepPending = false;
    const sep = this.o.blockSeparator!;
    if (!this.text || this.text.endsWith(sep)) return;
    this.text += sep;
    if (this.plainStrip) this.out += sep;
  }

  private breaksAt(ti: number, off: number): void {
    const breaks = this.o.breaks!;
    const here = { ti, off };
    while (this.bi < breaks.length && cmpPos(breaks[this.bi], here) <= 0) {
      this.bi++;
      this.out += this.closers() + this.o.breakClose! + this.o.breakOpen! + this.reopen();
    }
  }

  private excluded(tok: Token): boolean {
    const exclude = this.o.exclude;
    if (!exclude?.has(tok.tagName!)) return false;
    this.exDepth = trackDepth(tok, exclude, this.exDepth);
    return true;
  }

  private stripped(name: string): boolean {
    if (!this.o.stripTags) return false;
    return !this.o.selectiveTags || this.o.selectiveTags.has(name);
  }

  /** Update the open-element stack; returns the markup to write, or null when the tag is stripped. */
  private track(tok: Token): string | null {
    if (tok.type !== TokenType.OpenTag && tok.type !== TokenType.CloseTag) return null;
    const name = tok.tagName!;
    this.nvDepth = updateNonVisibleDepth(tok, this.nvDepth);
    if (this.stripped(name)) return null;
    if (tok.type === TokenType.OpenTag) return this.push(name, tok.raw) + tok.raw;
    const i = this.indexOf(name);
    if (i === -1) return this.o.repair ? '' : tok.raw;
    return this.truncate(i + 1) + this.truncate(i, false) + tok.raw;
  }

  private reopen(): string {
    let s = '';
    for (const e of this.stack) s += e.raw;
    return s;
  }

  /** Push an element, first closing the ones it implicitly ends; returns their end tags in repair mode. */
  private push(name: string, raw: string): string {
    const st = this.stack;
    const top = st.length ? st[st.length - 1].name : '';
    let closed = '';
    if ((top === 'p' && CLOSES_P.has(name)) || (name === 'option' && top === 'option')) closed = this.truncate(st.length - 1);
    else if (name === 'li') closed = this.popImplied(['li'], ['ul', 'ol']);
    else if (name === 'dt' || name === 'dd') closed = this.popImplied(['dt', 'dd'], ['dl']);
    else if (name === 'tr') closed = this.popImplied(['tr'], ['table', 'tbody', 'thead', 'tfoot']);
    else if (name === 'td' || name === 'th') closed = this.popImplied(['td', 'th'], ['tr', 'table']);
    st.push({ name, raw });
    return closed;
  }

  private popImplied(names: string[], scope: string[]): string {
    const st = this.stack;
    for (let i = st.length - 1; i >= 0; i--) {
      if (names.includes(st[i].name)) return this.truncate(i);
      if (scope.includes(st[i].name)) return '';
    }
    return '';
  }

  private indexOf(name: string): number {
    const st = this.stack;
    for (let i = st.length - 1; i >= 0; i--) if (st[i].name === name) return i;
    return -1;
  }

  /** Drop stack entries from `i` up; returns their end tags when repairing and `write` is set. */
  private truncate(i: number, write = true): string {
    const st = this.stack;
    let s = '';
    if (write && this.o.repair) for (let k = st.length - 1; k >= i; k--) s += `</${st[k].name}>`;
    st.length = i;
    return s;
  }
}

export interface RenderResult {
  html: string;
  text: string;
  closers: string;
}

/**
 * Render tokens between two positions, reopening ancestors at `from`.
 * `from`/`to` of undefined mean the start/end of the document.
 */
export function render(
  src: TokenSource,
  from: Pos | undefined,
  to: Pos | undefined,
  o: EmitOptions,
  cursor?: SkipCursor,
): RenderResult {
  const { tokens, decoded } = src;
  const startTi = from ? from.ti : 0;
  let em: Emitter;
  if (cursor) {
    cursor.advance(tokens, startTi);
    em = cursor.fork(o);
  } else {
    em = new Emitter(o);
    for (let ti = 0; ti < startTi && ti < tokens.length; ti++) em.skip(tokens[ti]);
  }
  if (from) em.begin();

  for (let ti = startTi; ti < tokens.length; ti++) {
    const tok = tokens[ti];
    if (to && ti >= to.ti && (ti > to.ti || tok.type !== TokenType.Text || to.off === 0)) break;
    const a = from && ti === from.ti ? from.off : 0;
    const b = to && ti === to.ti ? to.off : decoded[ti].length;
    em.emit(tok, ti, decoded[ti], a, b);
  }
  return { html: em.out, text: em.text, closers: em.closers() };
}

/** `render()` with the still-open elements closed. */
export function renderBalanced(
  src: TokenSource,
  from: Pos | undefined,
  to: Pos | undefined,
  o: EmitOptions,
  cursor?: SkipCursor,
): { html: string; text: string } {
  const r = render(src, from, to, o, cursor);
  return { html: r.html + r.closers, text: r.text };
}

/** Forward-only structure tracker so repeated renders don't rescan the document prefix. */
export class SkipCursor {
  private readonly em: Emitter;
  private ti = 0;

  constructor(o: EmitOptions) {
    this.em = new Emitter(o);
  }

  advance(tokens: Token[], toTi: number): void {
    if (toTi < this.ti) throw new Error('SkipCursor cannot move backwards');
    for (; this.ti < toTi && this.ti < tokens.length; this.ti++) this.em.skip(tokens[this.ti]);
  }

  fork(o: EmitOptions): Emitter {
    return this.em.fork(o);
  }
}

/**
 * True when a block element closes before any visible content in the upcoming tokens.
 *
 * @param count Number of upcoming tokens
 * @param tokenAt Token at upcoming index i
 * @param textAt Remaining decoded text of the token at upcoming index i
 * @return Whether an ellipsis would sit at a clean block end
 */
export function closesBlockNext(count: number, tokenAt: (i: number) => Token, textAt: (i: number) => string): boolean {
  for (let i = 0; i < count; i++) {
    const t = tokenAt(i);
    if (t.type === TokenType.CloseTag && BLOCK_ELEMENTS.has(t.tagName!)) return true;
    if (t.type === TokenType.OpenTag) return false;
    if (t.type === TokenType.Text && !isBlank(textAt(i))) return false;
  }
  return false;
}

export function atBlockEnd(src: TokenSource, to: Pos): boolean {
  const { tokens, decoded } = src;
  return closesBlockNext(
    tokens.length - to.ti,
    i => tokens[to.ti + i],
    i => (i === 0 ? decoded[to.ti].slice(to.off) : decoded[to.ti + i]),
  );
}
