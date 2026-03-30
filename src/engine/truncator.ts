import type { SplitResult, SplitUnit, Token } from '../types.js';
import { TokenType } from '../types.js';
import { decodeEntities, graphemeSlice } from '../parse/entities.js';
import { tokenize } from '../parse/tokenizer.js';
import { countUnits, textToUnits } from './counter.js';
import { updateNonVisibleDepth } from './visibility.js';
import { extractText } from './extractor.js';

function buildCloseTag(tagName: string): string {
  return `</${tagName}>`;
}

function sliceText(decoded: string, unitCount: number, by: SplitUnit, preserveWords: boolean): string {
  if (by === 'character') {
    if (preserveWords) {
      const sliced = graphemeSlice(decoded, 0, unitCount);
      const lastSpace = sliced.lastIndexOf(' ');
      if (lastSpace > 0 && lastSpace < sliced.length - 1) {
        return sliced.slice(0, lastSpace);
      }
      return sliced;
    }
    return graphemeSlice(decoded, 0, unitCount);
  }

  const units = textToUnits(decoded, by);
  return units.slice(0, unitCount).join(by === 'word' ? ' ' : ' ');
}

/** Map decoded char positions back to raw positions to preserve HTML entities in output */
function partialRaw(raw: string, decoded: string, partial: string, by: SplitUnit): string {
  if (by === 'character') {
    const partialLen = partial.length;
    let decodedIdx = 0;
    let rawIdx = 0;

    while (decodedIdx < partialLen && rawIdx < raw.length) {
      if (raw[rawIdx] === '&') {
        const semiIdx = raw.indexOf(';', rawIdx);
        if (semiIdx !== -1) {
          rawIdx = semiIdx + 1;
          decodedIdx++;
          continue;
        }
      }
      const code = raw.codePointAt(rawIdx)!;
      rawIdx += code > 0xFFFF ? 2 : 1;
      decodedIdx++;
    }
    return raw.slice(0, rawIdx);
  }

  return partial;
}

/** Accepts pre-tokenized tokens to avoid re-tokenizing */
export function splitFromTokens(
  tokens: Token[],
  html: string,
  keep: number,
  by: SplitUnit,
  ellipsis: string,
  suffix: string,
  preserveWords: boolean,
  stripTags: boolean,
): SplitResult {
  let totalCount = 0;
  let nvDepth = 0;
  for (const token of tokens) {
    nvDepth = updateNonVisibleDepth(token, nvDepth);
    if (nvDepth === 0 && token.type === TokenType.Text && token.content) {
      totalCount += countUnits(decodeEntities(token.content), by);
    }
  }

  if (keep >= totalCount) {
    return {
      html: stripTags ? extractText(tokens) : html,
      truncated: false,
      total: totalCount,
      kept: totalCount,
    };
  }

  let consumed = 0;
  let output = '';
  const tagStack: { tagName: string; attributes?: string }[] = [];
  let truncated = false;
  nvDepth = 0;
  let ellipsisInserted = false;

  for (const token of tokens) {
    if (truncated) break;
    nvDepth = updateNonVisibleDepth(token, nvDepth);

    switch (token.type) {
      case TokenType.OpenTag:
        if (!stripTags) {
          tagStack.push({ tagName: token.tagName!, attributes: token.attributes });
          output += token.raw;
        }
        break;

      case TokenType.CloseTag:
        if (!stripTags) {
          for (let j = tagStack.length - 1; j >= 0; j--) {
            if (tagStack[j].tagName === token.tagName) {
              tagStack.splice(j, 1);
              break;
            }
          }
          output += token.raw;
        }
        break;

      case TokenType.SelfClosingTag:
      case TokenType.Comment:
        if (!stripTags) output += token.raw;
        break;

      case TokenType.RawContent:
        if (!stripTags) output += token.raw;
        break;

      case TokenType.Text: {
        if (!token.content) break;

        if (nvDepth > 0) {
          if (!stripTags) output += token.raw;
          break;
        }

        const decoded = decodeEntities(token.content);
        const unitCount = countUnits(decoded, by);

        if (consumed + unitCount <= keep) {
          consumed += unitCount;
          output += stripTags ? decoded : token.raw;
          if (consumed === keep) {
            output += ellipsis;
            if (suffix) output += suffix;
            ellipsisInserted = true;
            truncated = true;
          }
        } else {
          const remaining = keep - consumed;
          const partial = sliceText(decoded, remaining, by, preserveWords);
          consumed += countUnits(partial, by);
          output += stripTags ? partial : partialRaw(token.content!, decoded, partial, by);
          output += ellipsis;
          if (suffix) output += suffix;
          ellipsisInserted = true;
          truncated = true;
        }
        break;
      }
    }
  }

  if (!ellipsisInserted) {
    output += ellipsis;
    if (suffix) output += suffix;
  }

  if (!stripTags) {
    for (let i = tagStack.length - 1; i >= 0; i--) {
      output += buildCloseTag(tagStack[i].tagName);
    }
  }

  return {
    html: output,
    truncated: true,
    total: totalCount,
    kept: consumed,
  };
}

/** Convenience: tokenizes then splits */
export function splitCore(
  html: string,
  keep: number,
  by: SplitUnit,
  ellipsis: string,
  suffix: string,
  preserveWords: boolean,
  stripTags: boolean,
): SplitResult {
  return splitFromTokens(tokenize(html), html, keep, by, ellipsis, suffix, preserveWords, stripTags);
}
