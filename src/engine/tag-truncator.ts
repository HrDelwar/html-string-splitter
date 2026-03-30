import type { SplitResult } from '../types.js';
import { TokenType } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { countByTag } from './counter.js';

function buildCloseTag(tagName: string): string {
  return `</${tagName}>`;
}

export function splitByTag(
  html: string,
  keep: number,
  tagName: string,
  ellipsis: string,
  suffix: string,
): SplitResult {
  const tokens = tokenize(html);
  const total = countByTag(html, tagName);

  if (keep >= total) {
    return { html, truncated: false, total: total, kept: total };
  }

  let found = 0;
  let output = '';
  const tagStack: string[] = [];
  let truncated = false;
  let insideTargetDepth = 0;

  for (const token of tokens) {
    if (truncated) break;

    switch (token.type) {
      case TokenType.OpenTag: {
        if (token.tagName === tagName) {
          found++;
          if (found > keep) {
            truncated = true;
            break;
          }
          insideTargetDepth++;
        }
        tagStack.push(token.tagName!);
        output += token.raw;
        break;
      }

      case TokenType.CloseTag: {
        if (token.tagName === tagName && insideTargetDepth > 0) {
          insideTargetDepth--;
        }
        for (let j = tagStack.length - 1; j >= 0; j--) {
          if (tagStack[j] === token.tagName) {
            tagStack.splice(j, 1);
            break;
          }
        }
        output += token.raw;
        break;
      }

      case TokenType.SelfClosingTag:
        if (token.tagName === tagName) {
          found++;
          if (found > keep) {
            truncated = true;
            break;
          }
        }
        output += token.raw;
        break;

      default:
        output += token.raw;
        break;
    }
  }

  if (truncated) {
    output += ellipsis;
    if (suffix) output += suffix;
  }

  for (let i = tagStack.length - 1; i >= 0; i--) {
    output += buildCloseTag(tagStack[i]);
  }

  return {
    html: output,
    truncated: true,
    total: total,
    kept: keep,
  };
}

export function stripConsumedByTag(html: string, skipCount: number, tagName: string): string {
  const tokens = tokenize(html);
  let found = 0;
  let output = '';
  let skipping = true;
  let insideSkippedTag = 0;
  const tagStack: string[] = [];

  for (const token of tokens) {
    if (!skipping) {
      output += token.raw;
      continue;
    }

    switch (token.type) {
      case TokenType.OpenTag:
        tagStack.push(token.tagName!);
        if (token.tagName === tagName) {
          found++;
          if (found > skipCount) {
            skipping = false;
            output += token.raw;
          } else {
            insideSkippedTag++;
          }
        } else if (insideSkippedTag === 0) {
          output += token.raw;
        }
        break;

      case TokenType.CloseTag:
        for (let j = tagStack.length - 1; j >= 0; j--) {
          if (tagStack[j] === token.tagName) {
            tagStack.splice(j, 1);
            break;
          }
        }
        if (token.tagName === tagName && insideSkippedTag > 0) {
          insideSkippedTag--;
        } else if (insideSkippedTag === 0) {
          output += token.raw;
        }
        break;

      case TokenType.SelfClosingTag:
        if (token.tagName === tagName) {
          found++;
          if (found > skipCount) {
            skipping = false;
            output += token.raw;
          }
        } else if (insideSkippedTag === 0) {
          output += token.raw;
        }
        break;

      default:
        if (insideSkippedTag === 0) {
          output += token.raw;
        }
        break;
    }
  }

  return output;
}
