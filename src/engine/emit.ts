import type { Token } from '../types.js';
import { TokenType } from '../types.js';
import { escapeHtml, rawOffset } from '../parse/entities.js';
import { BLOCK_ELEMENTS, HIDDEN_ELEMENTS, NON_VISIBLE_ELEMENTS } from './visibility.js';

export interface Pos {
  ti: number;
  off: number;
}

export interface Mark {
  s: Pos;
  e: Pos;
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
  marks?: Mark[];
  markOpen?: string;
  markClose?: string;
  /** Escape decoded text when tags are stripped (needed once markup is mixed back in). */
  escapeText?: boolean;
  breaks?: Pos[];
  breakOpen?: string;
  breakClose?: string;
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

export function cmpPos(a: Pos, ti: number, off: number): number {
  return a.ti !== ti ? a.ti - ti : a.off - off;
}

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
  private bi = 0;
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
    const type = tok.type;
    if (tok.tagName && this.excluded(tok)) return;
    if (this.exDepth > 0) return;

    switch (type) {
      case TokenType.OpenTag:
        if (NON_VISIBLE_ELEMENTS.has(tok.tagName!)) this.nvDepth++;
        if (this.stripped(tok.tagName!)) return;
        this.push(tok.tagName!, tok.raw);
        this.out += tok.raw;
        return;
      case TokenType.CloseTag:
        if (NON_VISIBLE_ELEMENTS.has(tok.tagName!)) this.nvDepth = Math.max(0, this.nvDepth - 1);
        if (this.stripped(tok.tagName!)) return;
        this.pop(tok.tagName!);
        this.out += tok.raw;
        return;
      case TokenType.SelfClosingTag:
        if (!this.stripped(tok.tagName!)) this.out += tok.raw;
        return;
      case TokenType.Comment:
        if (!this.o.stripComments && !this.plainStrip) this.out += tok.raw;
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
    const marks = this.o.marks;
    const cursor = { raw: 0, decoded: 0 };
    let p = a;
    while (p < b) {
      if (this.o.breaks && p > a) this.breaksAt(ti, p);
      let q = b;
      let marked = false;

      if (this.o.breaks) {
        const br = this.o.breaks[this.bi];
        if (br && br.ti === ti && br.off > p && br.off < q) q = br.off;
      }

      if (marks) {
        while (this.mi < marks.length && cmpPos(marks[this.mi].e, ti, p) <= 0) this.mi++;
        const m = marks[this.mi];
        if (m) {
          if (cmpPos(m.s, ti, p) <= 0) {
            marked = true;
            if (m.e.ti === ti && m.e.off < q) q = m.e.off;
          } else if (m.s.ti === ti && m.s.off < q) {
            q = m.s.off;
          }
        }
      }

      const s = d.slice(p, q);
      this.text += s;
      let piece: string;
      if (this.plainStrip) {
        piece = this.o.escapeText ? escapeHtml(s) : s;
      } else {
        const r0 = rawOffset(raw, p, cursor);
        piece = raw.slice(r0, rawOffset(raw, q, cursor));
      }
      this.out += marked ? this.o.markOpen! + piece + this.o.markClose! : piece;
      p = q;
    }
  }

  private breaksAt(ti: number, off: number): void {
    const breaks = this.o.breaks!;
    while (this.bi < breaks.length && cmpPos(breaks[this.bi], ti, off) <= 0) {
      this.bi++;
      this.out += this.closers() + this.o.breakClose! + this.o.breakOpen! + this.reopen();
    }
  }

  private excluded(tok: Token): boolean {
    const exclude = this.o.exclude;
    if (!exclude || !exclude.has(tok.tagName!)) return false;
    if (tok.type === TokenType.OpenTag) this.exDepth++;
    else if (tok.type === TokenType.CloseTag) this.exDepth = Math.max(0, this.exDepth - 1);
    return true;
  }

  private stripped(name: string): boolean {
    if (!this.o.stripTags) return false;
    return !this.o.selectiveTags || this.o.selectiveTags.has(name);
  }

  private track(tok: Token): void {
    if (tok.type === TokenType.OpenTag) {
      if (NON_VISIBLE_ELEMENTS.has(tok.tagName!)) this.nvDepth++;
      if (!this.stripped(tok.tagName!)) this.push(tok.tagName!, tok.raw);
    } else if (tok.type === TokenType.CloseTag) {
      if (NON_VISIBLE_ELEMENTS.has(tok.tagName!)) this.nvDepth = Math.max(0, this.nvDepth - 1);
      if (!this.stripped(tok.tagName!)) this.pop(tok.tagName!);
    }
  }

  private reopen(): string {
    let s = '';
    for (const e of this.stack) s += e.raw;
    return s;
  }

  private push(name: string, raw: string): void {
    const st = this.stack;
    const top = st.length ? st[st.length - 1].name : '';
    if (top === 'p' && CLOSES_P.has(name)) st.pop();
    else if (name === 'li') this.popImplied(['li'], ['ul', 'ol']);
    else if (name === 'dt' || name === 'dd') this.popImplied(['dt', 'dd'], ['dl']);
    else if (name === 'tr') this.popImplied(['tr'], ['table', 'tbody', 'thead', 'tfoot']);
    else if (name === 'td' || name === 'th') this.popImplied(['td', 'th'], ['tr', 'table']);
    else if (name === 'option' && top === 'option') st.pop();
    st.push({ name, raw });
  }

  private popImplied(names: string[], scope: string[]): void {
    const st = this.stack;
    for (let i = st.length - 1; i >= 0; i--) {
      if (names.includes(st[i].name)) {
        st.length = i;
        return;
      }
      if (scope.includes(st[i].name)) return;
    }
  }

  private pop(name: string): void {
    const st = this.stack;
    for (let i = st.length - 1; i >= 0; i--) {
      if (st[i].name === name) {
        st.length = i;
        return;
      }
    }
  }
}

export interface RenderResult {
  html: string;
  text: string;
  closers: string;
}

/**
 * Render tokens between two positions with balanced tags.
 * `from`/`to` of undefined mean the start/end of the document.
 */
export function render(
  tokens: Token[],
  decoded: string[],
  from: Pos | undefined,
  to: Pos | undefined,
  o: EmitOptions,
  cursor?: SkipCursor,
): RenderResult {
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

/** True when nothing visible follows `to` before a block element closes. */
export function atBlockEnd(tokens: Token[], decoded: string[], to: Pos): boolean {
  let ti = to.ti;
  if (tokens[ti]?.type === TokenType.Text) {
    if (/\S/.test(decoded[ti].slice(to.off))) return false;
    ti++;
  }
  for (; ti < tokens.length; ti++) {
    const t = tokens[ti];
    if (t.type === TokenType.CloseTag && BLOCK_ELEMENTS.has(t.tagName!)) return true;
    if (t.type === TokenType.Text && /\S/.test(decoded[ti])) return false;
    if (t.type === TokenType.OpenTag) return false;
  }
  return false;
}
