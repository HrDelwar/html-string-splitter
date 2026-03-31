import type { SplitResult, SplitUnit, Token } from '../types.js';
import { TokenType } from '../types.js';
import { decodeEntities, graphemeSlice } from '../parse/entities.js';
import { tokenize } from '../parse/tokenizer.js';
import { countUnits, textToUnits } from './counter.js';
import { updateNonVisibleDepth, BLOCK_ELEMENTS } from './visibility.js';
import { extractText } from './extractor.js';

export interface TruncateOptions {
  keep: number;
  by: SplitUnit;
  ellipsis: string;
  suffix: string;
  preserveWords: boolean | number | 'trim';
  stripTags: boolean;
  selectiveTags?: Set<string>;
  stripComments?: boolean;
  smartEllipsis?: boolean;
  imageWeight?: number;
  exclude?: Set<string>;
  outputText?: boolean;
  wordPattern?: RegExp;
}

function buildCloseTag(tagName: string): string {
  return `</${tagName}>`;
}

function sliceText(decoded: string, unitCount: number, by: SplitUnit, preserveWords: boolean | number | 'trim', wordPattern?: RegExp): string {
  if (by === 'character') {
    if (preserveWords) {
      const sliced = graphemeSlice(decoded, 0, unitCount);
      if (preserveWords === true || preserveWords === 'trim') {
        // Backtrack to last word boundary, trim trailing space
        const trimmed = sliced.trimEnd();
        const lastSpace = trimmed.lastIndexOf(' ');
        if (lastSpace >= 0 && lastSpace < trimmed.length - 1) {
          return trimmed.slice(0, lastSpace + 1).trimEnd();
        }
        return trimmed;
      }
      const extended = graphemeSlice(decoded, 0, unitCount + preserveWords);
      let scanFrom = sliced.length;
      while (scanFrom < extended.length && extended[scanFrom] === ' ') scanFrom++;
      const spaceAfter = extended.indexOf(' ', scanFrom);
      if (spaceAfter !== -1) {
        return extended.slice(0, spaceAfter);
      }
      return extended;
    }
    return graphemeSlice(decoded, 0, unitCount);
  }

  const units = textToUnits(decoded, by, wordPattern);
  if (wordPattern) {
    const kept = units.slice(0, unitCount);
    if (kept.length === 0) return '';
    const lastUnit = kept[kept.length - 1];
    let searchFrom = 0;
    for (let i = 0; i < kept.length - 1; i++) {
      searchFrom = decoded.indexOf(kept[i], searchFrom) + kept[i].length;
    }
    const lastIdx = decoded.indexOf(lastUnit, searchFrom);
    return decoded.slice(0, lastIdx + lastUnit.length);
  }
  return units.slice(0, unitCount).join(' ');
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

const MEDIA_ELEMENTS = new Set(['img', 'svg', 'video', 'audio', 'picture', 'canvas', 'iframe']);

function isNextBlockClose(tokens: Token[], fromIndex: number): boolean {
  for (let i = fromIndex + 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === TokenType.CloseTag && BLOCK_ELEMENTS.has(t.tagName!)) return true;
    if (t.type === TokenType.Text && t.content && t.content.trim()) return false;
    if (t.type === TokenType.OpenTag) return false;
  }
  return false;
}

function rebuildWithoutExcluded(tokens: Token[], exclude: Set<string> | undefined, stripTags: boolean, selectiveTags?: Set<string>, stripComments?: boolean): string {
  let output = '';
  let exDepth = 0;

  for (const token of tokens) {
    if (exclude) {
      if (token.type === TokenType.OpenTag && exclude.has(token.tagName!)) { exDepth++; continue; }
      if (token.type === TokenType.CloseTag && exclude.has(token.tagName!)) { exDepth = Math.max(0, exDepth - 1); continue; }
      if (exDepth > 0) continue;
      if (token.type === TokenType.SelfClosingTag && exclude.has(token.tagName!)) continue;
    }

    if (stripTags) {
      if (selectiveTags) {
        // Only strip selective tags
        if ((token.type === TokenType.OpenTag || token.type === TokenType.CloseTag || token.type === TokenType.SelfClosingTag) && selectiveTags.has(token.tagName!)) continue;
      } else {
        if (token.type === TokenType.OpenTag || token.type === TokenType.CloseTag || token.type === TokenType.SelfClosingTag) continue;
      }
    }
    if (stripComments && token.type === TokenType.Comment) continue;
    if (token.type === TokenType.Text && token.content && stripTags && !selectiveTags) {
      output += decodeEntities(token.content);
    } else {
      output += token.raw;
    }
  }
  return output;
}

/** Accepts pre-tokenized tokens to avoid re-tokenizing */
export function splitFromTokens(
  tokens: Token[],
  html: string,
  opts: TruncateOptions,
): SplitResult {
  const { keep, by, ellipsis, suffix, preserveWords, stripTags, selectiveTags, stripComments, smartEllipsis, imageWeight, exclude, outputText, wordPattern } = opts;
  const isLine = by === 'line';

  // --- Counting pass ---
  let totalCount = 0;
  let nvDepth = 0;
  let exDepth = 0;
  for (const token of tokens) {
    nvDepth = updateNonVisibleDepth(token, nvDepth);
    if (exclude) {
      if (token.type === TokenType.OpenTag && exclude.has(token.tagName!)) exDepth++;
      if (token.type === TokenType.CloseTag && exclude.has(token.tagName!)) exDepth = Math.max(0, exDepth - 1);
    }
    if (nvDepth > 0 || exDepth > 0) continue;

    if (isLine) {
      if (token.type === TokenType.OpenTag && BLOCK_ELEMENTS.has(token.tagName!)) totalCount++;
      if (token.type === TokenType.SelfClosingTag && (token.tagName === 'br' || token.tagName === 'hr')) totalCount++;
    } else {
      if (token.type === TokenType.Text && token.content) {
        totalCount += countUnits(decodeEntities(token.content), by, wordPattern);
      }
      if (imageWeight && (token.type === TokenType.OpenTag || token.type === TokenType.SelfClosingTag) && MEDIA_ELEMENTS.has(token.tagName!)) {
        totalCount += imageWeight;
      }
    }
  }

  if (keep >= totalCount) {
    let resultHtml: string;
    const needsRebuild = exclude || (stripTags && selectiveTags) || stripComments;
    if (needsRebuild) {
      resultHtml = rebuildWithoutExcluded(tokens, exclude, stripTags, selectiveTags, stripComments);
    } else {
      resultHtml = stripTags ? extractText(tokens) : html;
    }
    const result: SplitResult = {
      html: resultHtml,
      truncated: false,
      total: totalCount,
      kept: totalCount,
    };
    if (outputText) result.text = extractText(tokens);
    return result;
  }

  // --- Main splitting pass ---
  let consumed = 0;
  let output = '';
  let textOutput = outputText ? '' : undefined;
  const tagStack: { tagName: string; attributes?: string }[] = [];
  let truncated = false;
  nvDepth = 0;
  exDepth = 0;
  let ellipsisInserted = false;

  const shouldStripTag = (tag: string) => {
    if (!stripTags) return false;
    if (!selectiveTags) return true;
    return selectiveTags.has(tag);
  };

  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];
    if (truncated) break;
    nvDepth = updateNonVisibleDepth(token, nvDepth);

    // Exclude tracking
    if (exclude) {
      if (token.type === TokenType.OpenTag && exclude.has(token.tagName!)) exDepth++;
      if (token.type === TokenType.CloseTag && exclude.has(token.tagName!)) { exDepth = Math.max(0, exDepth - 1); continue; }
      if (exDepth > 0) continue;
    }

    switch (token.type) {
      case TokenType.OpenTag: {
        // Line counting: block open = 1 line
        if (isLine && BLOCK_ELEMENTS.has(token.tagName!)) {
          if (consumed + 1 > keep) { truncated = true; break; }
          consumed++;
        }

        // imageWeight: check before emitting — truncate if it would exceed keep
        if (!isLine && imageWeight && MEDIA_ELEMENTS.has(token.tagName!)) {
          if (consumed + imageWeight > keep) {
            truncated = true;
            break;
          }
          consumed += imageWeight;
        }

        const stripped = shouldStripTag(token.tagName!);
        if (!stripped) {
          tagStack.push({ tagName: token.tagName!, attributes: token.attributes });
          output += token.raw;
        }
        break;
      }

      case TokenType.CloseTag: {
        const stripped = shouldStripTag(token.tagName!);
        if (!stripped) {
          for (let j = tagStack.length - 1; j >= 0; j--) {
            if (tagStack[j].tagName === token.tagName) {
              tagStack.splice(j, 1);
              break;
            }
          }
          output += token.raw;
        }

        break;
      }

      case TokenType.SelfClosingTag:
        // Line counting: <br>/<hr> = 1 line
        if (isLine && (token.tagName === 'br' || token.tagName === 'hr')) {
          if (consumed + 1 > keep) { truncated = true; break; }
          consumed++;
        }
        // imageWeight: check before emitting
        if (!isLine && imageWeight && MEDIA_ELEMENTS.has(token.tagName!)) {
          if (consumed + imageWeight > keep) {
            truncated = true;
            break;
          }
          consumed += imageWeight;
        }
        if (!shouldStripTag(token.tagName!)) output += token.raw;
        break;

      case TokenType.Comment:
        if (!stripComments) output += token.raw;
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

        // Line mode: text is passed through without counting
        if (isLine) {
          output += stripTags ? decodeEntities(token.content) : token.raw;
          if (textOutput !== undefined) textOutput += decodeEntities(token.content);
          break;
        }

        const decoded = decodeEntities(token.content);
        const unitCount = countUnits(decoded, by, wordPattern);

        if (consumed + unitCount <= keep) {
          consumed += unitCount;
          output += stripTags ? decoded : token.raw;
          if (textOutput !== undefined) textOutput += decoded;
          if (consumed === keep) {
            const atBlock = smartEllipsis && isNextBlockClose(tokens, ti);
            output += atBlock ? '' : ellipsis;
            if (suffix) output += suffix;
            ellipsisInserted = true;
            truncated = true;
          }
        } else {
          const remaining = keep - consumed;
          const partial = sliceText(decoded, remaining, by, preserveWords, wordPattern);
          consumed += countUnits(partial, by, wordPattern);
          output += stripTags ? partial : partialRaw(token.content!, decoded, partial, by);
          if (textOutput !== undefined) textOutput += partial;
          // Partial text = mid-content truncation, always show ellipsis
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

  if (!stripTags || selectiveTags) {
    for (let i = tagStack.length - 1; i >= 0; i--) {
      output += buildCloseTag(tagStack[i].tagName);
    }
  }

  const result: SplitResult = {
    html: output,
    truncated: true,
    total: totalCount,
    kept: consumed,
  };
  if (textOutput !== undefined) result.text = textOutput;
  return result;
}

/** Convenience: tokenizes then splits */
export function splitCore(html: string, opts: TruncateOptions): SplitResult {
  return splitFromTokens(tokenize(html), html, opts);
}
