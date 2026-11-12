import { TokenType } from '../types.js';
import { toDoc, type DocCore, type HtmlInput } from '../engine/doc.js';
import { renderBalanced, type Pos } from '../engine/emit.js';

const PARTIAL_TAG = /^<[!?/a-zA-Z]/;
const PARTIAL_START = /<\/?$/;

/**
 * Balance broken or partial HTML: close open elements, write end tags that were implied,
 * drop stray end tags and a tag cut off at the end of the input.
 *
 * @param html HTML string or parsed document
 * @return Well-formed HTML
 */
export function repair(html: HtmlInput): string {
  const doc = toDoc(html);
  if (!doc) return '';
  return renderBalanced(doc, undefined, partialEnd(doc), { repair: true }).html;
}

function partialEnd({ tokens, decoded }: DocCore): Pos | undefined {
  const ti = tokens.length - 1;
  const { type, raw } = tokens[ti];
  if (type !== TokenType.Text) return undefined;
  if (PARTIAL_TAG.test(raw)) return { ti, off: 0 };
  const m = PARTIAL_START.exec(raw);
  return m ? { ti, off: decoded[ti].length - m[0].length } : undefined;
}
