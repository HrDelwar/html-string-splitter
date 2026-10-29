import type { Token, WrapOptions } from '../types.js';
import { TokenType } from '../types.js';
import { startPos, toDoc, type HtmlInput } from '../engine/doc.js';
import { render, type Pos } from '../engine/emit.js';
import { resolveSpec } from '../engine/unit.js';
import { buildOpenTag } from '../engine/search.js';

export function wrap(html: HtmlInput, options: WrapOptions): string {
  const doc = toDoc(html);
  if (!doc) return '';
  const { every, tag = 'span', className, attributes } = options;
  if (typeof every !== 'number' || every <= 0 || !Number.isFinite(every)) return doc.html;

  const spec = resolveSpec(options);
  const openTag = buildOpenTag(tag, className, attributes);
  const closeTag = `</${tag}>`;
  if (spec.tag) return wrapByTag(doc.tokens, every, spec.tag, openTag, closeTag);

  const atoms = doc.atoms(spec);
  const { tokens, decoded } = doc;
  const breaks: Pos[] = [];
  let units = every;
  for (;;) {
    const idx = atoms.firstFrom(units);
    if (idx >= atoms.n) break;
    const pos = startPos(atoms, idx)!;
    if (pos.off === 0) {
      while (pos.ti > 0 && isLeadIn(tokens[pos.ti - 1], decoded[pos.ti - 1])) pos.ti--;
    }
    breaks.push(pos);
    units = atoms.cumBefore(idx) + every;
  }

  const r = render(tokens, decoded, undefined, undefined, { exclude: spec.exclude, breaks, breakOpen: openTag, breakClose: closeTag });
  return openTag + r.html + r.closers + closeTag;
}

function isLeadIn(tok: Token, decoded: string): boolean {
  if (tok.type === TokenType.OpenTag) return true;
  return tok.type === TokenType.Text && !/\S/.test(decoded);
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
