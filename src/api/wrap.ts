import type { SplitUnit, WrapOptions } from '../types.js';
import { TokenType } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { decodeEntities, graphemeLength, graphemeSlice } from '../parse/entities.js';
import { countUnits } from '../engine/counter.js';
import { resolveUnit } from '../engine/unit.js';
import { updateNonVisibleDepth } from '../engine/visibility.js';

function buildOpenTag(tag: string, className?: string, attributes?: Record<string, string>): string {
  let s = `<${tag}`;
  if (className) s += ` class="${className}"`;
  if (attributes) {
    for (const [k, v] of Object.entries(attributes)) {
      s += ` ${k}="${v}"`;
    }
  }
  return s + '>';
}

export function wrap(html: string, options: WrapOptions): string {
  if (!html || typeof html !== 'string') return '';
  const { every, by: rawBy = 'character', tag = 'span', className, attributes } = options;
  if (typeof every !== 'number' || every <= 0 || !Number.isFinite(every)) return html;

  const by = resolveUnit(rawBy);
  const tokens = tokenize(html);
  const openTag = buildOpenTag(tag, className, attributes);
  const closeTag = `</${tag}>`;

  let consumed = 0;
  let output = openTag;
  const tagStack: { tagName: string; raw: string }[] = [];
  let nvDepth = 0;

  for (const token of tokens) {
    nvDepth = updateNonVisibleDepth(token, nvDepth);

    switch (token.type) {
      case TokenType.OpenTag:
        tagStack.push({ tagName: token.tagName!, raw: token.raw });
        output += token.raw;
        break;

      case TokenType.CloseTag:
        for (let j = tagStack.length - 1; j >= 0; j--) {
          if (tagStack[j].tagName === token.tagName) {
            tagStack.splice(j, 1);
            break;
          }
        }
        output += token.raw;
        break;

      case TokenType.SelfClosingTag:
      case TokenType.Comment:
      case TokenType.RawContent:
        output += token.raw;
        break;

      case TokenType.Text: {
        if (!token.content || nvDepth > 0) {
          output += token.raw;
          break;
        }

        const decoded = decodeEntities(token.content);
        const unitCount = countUnits(decoded, by);

        if (consumed + unitCount <= every) {
          consumed += unitCount;
          output += token.raw;
          if (consumed === every) {
            consumed = 0;
            // Close inner tags, close wrapper, open new wrapper, reopen inner tags
            for (let i = tagStack.length - 1; i >= 0; i--) {
              output += `</${tagStack[i].tagName}>`;
            }
            output += closeTag + openTag;
            for (const entry of tagStack) {
              output += entry.raw;
            }
          }
        } else {
          // Need to split this text token across wrapper boundaries
          let remaining = decoded;
          let rawRemaining = token.content!;
          while (remaining.length > 0) {
            const space = every - consumed;
            const unitSpace = countUnits(remaining, by);

            if (unitSpace <= space) {
              consumed += unitSpace;
              output += rawRemaining;
              break;
            }

            // Take what fits
            const partial = by === 'character'
              ? graphemeSlice(remaining, 0, space)
              : remaining; // for word/sentence, take the full text (simplified)
            const partialUnits = countUnits(partial, by);
            output += partial;
            consumed += partialUnits;

            // Advance remaining
            if (by === 'character') {
              remaining = graphemeSlice(remaining, space);
              rawRemaining = remaining;
            } else {
              remaining = '';
              rawRemaining = '';
            }

            if (consumed >= every && remaining.length > 0) {
              consumed = 0;
              for (let i = tagStack.length - 1; i >= 0; i--) {
                output += `</${tagStack[i].tagName}>`;
              }
              output += closeTag + openTag;
              for (const entry of tagStack) {
                output += entry.raw;
              }
            }
          }
        }
        break;
      }
    }
  }

  output += closeTag;
  return output;
}
