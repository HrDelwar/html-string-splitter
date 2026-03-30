import type { SplitUnit } from '../types.js';
import { TokenType } from '../types.js';
import { decodeEntities, graphemeSlice } from '../parse/entities.js';
import { tokenize } from '../parse/tokenizer.js';
import { countUnits, textToUnits } from './counter.js';

export function stripConsumed(html: string, unitCount: number, by: SplitUnit): string {
  const tokens = tokenize(html);
  let consumed = 0;
  let output = '';
  const tagStack: string[] = [];
  let skipping = true;

  for (const token of tokens) {
    if (!skipping) {
      output += token.raw;
      continue;
    }

    switch (token.type) {
      case TokenType.OpenTag:
        tagStack.push(token.tagName!);
        output += token.raw;
        break;

      case TokenType.CloseTag: {
        const idx = tagStack.lastIndexOf(token.tagName!);
        if (idx !== -1) tagStack.splice(idx, 1);
        output += token.raw;
        break;
      }

      case TokenType.SelfClosingTag:
      case TokenType.Comment:
      case TokenType.RawContent:
        output += token.raw;
        break;

      case TokenType.Text: {
        if (!token.content) {
          output += token.raw;
          break;
        }
        const decoded = decodeEntities(token.content);
        const units = countUnits(decoded, by);

        if (consumed + units <= unitCount) {
          consumed += units;
          if (consumed >= unitCount) skipping = false;
        } else {
          const remaining = unitCount - consumed;
          const partial = sliceText(decoded, remaining, by);
          const partialUnits = countUnits(partial, by);
          const restText = sliceTextFrom(decoded, partialUnits, by);
          consumed = unitCount;
          skipping = false;
          output += restText;
        }
        break;
      }
    }
  }

  return output;
}

function sliceText(decoded: string, unitCount: number, by: SplitUnit): string {
  if (by === 'character') return graphemeSlice(decoded, 0, unitCount);
  const units = textToUnits(decoded, by);
  return units.slice(0, unitCount).join(by === 'word' ? ' ' : ' ');
}

function sliceTextFrom(decoded: string, fromUnit: number, by: SplitUnit): string {
  if (by === 'character') return graphemeSlice(decoded, fromUnit);
  const units = textToUnits(decoded, by);
  return units.slice(fromUnit).join(' ');
}
