import { TokenType } from '../types.js';
import type { DocCore } from './doc.js';
import type { Mark } from './emit.js';
import { firstIndex, type Pos } from './util.js';
import { updateNonVisibleDepth } from './visibility.js';
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

  constructor(doc: DocCore) {
    const { tokens, decoded } = doc;
    let nv = 0;
    for (let ti = 0; ti < tokens.length; ti++) {
      nv = updateNonVisibleDepth(tokens[ti], nv);
      if (nv > 0 || tokens[ti].type !== TokenType.Text || !decoded[ti]) continue;
      this.segTi.push(ti);
      this.segStart.push(this.text.length);
      this.text += decoded[ti];
    }
  }

  /** Token position for a plain-text offset; `end` resolves boundaries to the earlier token. */
  pos(offset: number, end = false): Pos {
    const starts = this.segStart;
    const i = Math.max(0, firstIndex(0, starts.length, k => (end ? starts[k] >= offset : starts[k] > offset)) - 1);
    return { ti: this.segTi[i], off: offset - starts[i] };
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
