import type { WrapOptions } from '../types.js';
import { TokenType } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { decodeEntities, graphemeSlice } from '../parse/entities.js';
import { countUnits, textToUnits } from '../engine/counter.js';
import { resolveUnit } from '../engine/unit.js';
import { updateNonVisibleDepth } from '../engine/visibility.js';
import { buildOpenTag } from '../engine/search.js';

function sliceByUnit(text: string, start: number, end: number | undefined, by: string): string {
  if (by === 'character') return graphemeSlice(text, start, end);
  const units = textToUnits(text, by);
  return units.slice(start, end).join(' ');
}

function insertBoundary(output: string, tagStack: { tagName: string; raw: string }[], closeTag: string, openTag: string): string {
  for (let i = tagStack.length - 1; i >= 0; i--) {
    output += `</${tagStack[i].tagName}>`;
  }
  output += closeTag + openTag;
  for (const entry of tagStack) {
    output += entry.raw;
  }
  return output;
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
            output = insertBoundary(output, tagStack, closeTag, openTag);
          }
        } else {
          // Split this text across wrapper boundaries
          let unitOffset = 0;
          while (unitOffset < unitCount) {
            const space = every - consumed;
            const remaining = unitCount - unitOffset;

            if (remaining <= space) {
              output += sliceByUnit(decoded, unitOffset, undefined, by);
              consumed += remaining;
              unitOffset = unitCount;
              if (consumed === every) {
                consumed = 0;
                output = insertBoundary(output, tagStack, closeTag, openTag);
              }
            } else {
              output += sliceByUnit(decoded, unitOffset, unitOffset + space, by);
              unitOffset += space;
              consumed = 0;
              if (unitOffset < unitCount) {
                output = insertBoundary(output, tagStack, closeTag, openTag);
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
