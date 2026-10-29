import type { Token, WrapOptions } from '../types.js';
import { TokenType } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { renderBalanced, type Pos } from '../engine/emit.js';
import { resolveSpec } from '../engine/unit.js';
import { tagPair } from '../engine/search.js';
import { isBlank, isPositive } from '../engine/util.js';

export function wrap(html: HtmlInput, options: WrapOptions): string {
  const doc = toDoc(html);
  if (!doc) return '';
  const { every } = options;
  if (!isPositive(every)) return doc.html;

  const spec = resolveSpec(options);
  const [openTag, closeTag] = tagPair('span', options);
  if (spec.tag) return wrapByTag(doc.tokens, every, spec.tag, openTag, closeTag);

  const atoms = doc.atoms(spec);
  const { tokens, decoded } = doc;
  const breaks: Pos[] = [];
  let units = every;
  for (;;) {
    const idx = atoms.firstFrom(units);
    if (idx >= atoms.n) break;
    const pos = atoms.start(idx)!;
    if (pos.off === 0) {
      while (pos.ti > 0 && isLeadIn(tokens[pos.ti - 1], decoded[pos.ti - 1])) pos.ti--;
    }
    breaks.push(pos);
    units = atoms.cumBefore(idx) + every;
  }

  const body = renderBalanced(doc, undefined, undefined, { exclude: spec.exclude, breaks, breakOpen: openTag, breakClose: closeTag });
  return openTag + body.html + closeTag;
}

function isLeadIn(tok: Token, decoded: string): boolean {
  if (tok.type === TokenType.OpenTag) return true;
  return tok.type === TokenType.Text && isBlank(decoded);
}

function wrapByTag(tokens: Token[], every: number, tagName: string, openTag: string, closeTag: string): string {
  let output = openTag;
  let found = 0;
  let depth = 0;

  for (const token of tokens) {
    if (token.type === TokenType.OpenTag && token.tagName === tagName) {
      found++;
      if (found > 1 && (found - 1) % every === 0 && depth === 0) {
        output += closeTag + openTag;
      }
      depth++;
    }

    if (token.type === TokenType.CloseTag && token.tagName === tagName) {
      depth--;
    }

    if (token.type === TokenType.SelfClosingTag && token.tagName === tagName) {
      found++;
      if (found > 1 && (found - 1) % every === 0) {
        output += closeTag + openTag;
      }
    }

    output += token.raw;
  }

  output += closeTag;
  return output;
}
