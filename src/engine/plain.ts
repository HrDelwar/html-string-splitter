import { TokenType } from '../types.js';
import type { DocCore } from './doc.js';
import type { Mark } from './emit.js';
import { firstIndex, type Pos } from './util.js';
import { BLOCK_ELEMENTS, updateNonVisibleDepth } from './visibility.js';
import { buildRegex } from './search.js';

export interface TextMatch {
  start: number;
  end: number;
  text: string;
  mark: Mark;
}

/** Visible text of a document with a map back to token positions. */
export class PlainText {
  text = '';
  private readonly segTi: number[] = [];
  private readonly segStart: number[] = [];
  private readonly segEnd: number[] = [];

  /**
   * @param doc Parsed document
   * @param separator Inserted before block elements, as in `text()`
   */
  constructor(doc: DocCore, separator?: string) {
    const { tokens, decoded } = doc;
    let nv = 0;
    for (let ti = 0; ti < tokens.length; ti++) {
      const tok = tokens[ti];
      nv = updateNonVisibleDepth(tok, nv);
      if (nv > 0) continue;
      if (separator && this.text && (tok.type === TokenType.OpenTag || tok.type === TokenType.SelfClosingTag) &&
        BLOCK_ELEMENTS.has(tok.tagName!) && !this.text.endsWith(separator)) {
        this.text += separator;
      }
      if (tok.type !== TokenType.Text || !decoded[ti]) continue;
      this.segTi.push(ti);
      this.segStart.push(this.text.length);
      this.text += decoded[ti];
      this.segEnd.push(this.text.length);
    }
  }

  /**
   * Token position for a plain-text offset. Offsets inside a separator move to the next text
   * for a start, or back to the previous text for an `end`.
   */
  pos(offset: number, end = false): Pos {
    const starts = this.segStart;
    const i = Math.max(0, firstIndex(0, starts.length, k => (end ? starts[k] >= offset : starts[k] > offset)) - 1);
    const len = this.segEnd[i] - starts[i];
    const off = offset - starts[i];
    if (off <= len) return { ti: this.segTi[i], off };
    return !end && i + 1 < starts.length ? { ti: this.segTi[i + 1], off: 0 } : { ti: this.segTi[i], off: len };
  }

  matches(query: string | RegExp): TextMatch[] {
    const out: TextMatch[] = [];
    if (!this.text) return out;
    const re = buildRegex(query);
    let m: RegExpExecArray | null;
    while ((m = re.exec(this.text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      const start = m.index;
      const end = start + m[0].length;
      out.push({ start, end, text: m[0], mark: { s: this.pos(start), e: this.pos(end, true) } });
    }
    return out;
  }
}
