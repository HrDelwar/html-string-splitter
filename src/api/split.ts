import type { SplitOptions, SplitResult, Token } from '../types.js';
import { TokenType } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { resolveUnit, isTagUnit } from '../engine/unit.js';
import { countByTag } from '../engine/counter.js';
import { splitFromTokens } from '../engine/truncator.js';
import { splitByTag, stripConsumedByTag } from '../engine/tag-truncator.js';
import { stripConsumed } from '../engine/skipper.js';
import { extractText } from '../engine/extractor.js';
import { countFromTokens } from './count.js';

/** Post-process HTML to apply exclude, stripComments, and extract text */
function postProcess(resultHtml: string, exclude?: Set<string>, stripComments?: boolean, outputText?: boolean): { html: string; text?: string } {
  if (!exclude && !stripComments && !outputText) return { html: resultHtml };

  const tokens = tokenize(resultHtml);
  let html = '';
  let exDepth = 0;

  for (const token of tokens) {
    if (exclude) {
      if (token.type === TokenType.OpenTag && exclude.has(token.tagName!)) { exDepth++; continue; }
      if (token.type === TokenType.CloseTag && exclude.has(token.tagName!)) { exDepth = Math.max(0, exDepth - 1); continue; }
      if (exDepth > 0) continue;
      if (token.type === TokenType.SelfClosingTag && exclude.has(token.tagName!)) continue;
    }
    if (stripComments && token.type === TokenType.Comment) continue;
    html += token.raw;
  }

  const result: { html: string; text?: string } = { html };
  if (outputText) result.text = extractText(tokenize(html));
  return result;
}

export function split(html: string, options: SplitOptions): SplitResult {
  if (!html || typeof html !== 'string') {
    return { html: '', truncated: false, total: 0, kept: 0 };
  }

  const {
    keep,
    by: rawBy = 'character',
    ellipsis: rawEllipsis,
    suffix = '',
    preserveWords = false,
    stripTags = options.output === 'text' ? true : false,
    from = 'start',
    selectiveTags,
    stripComments = false,
    smartEllipsis = false,
    imageWeight = 0,
    exclude,
    wordPattern,
    output = 'html',
  } = options;
  const by = resolveUnit(rawBy);

  if (typeof keep !== 'number' || keep < 0 || !Number.isFinite(keep)) {
    return { html: '', truncated: false, total: 0, kept: 0 };
  }

  const tag = isTagUnit(by);
  const ellipsis = rawEllipsis ?? (tag ? '' : '...');
  const excludeSet = exclude ? new Set(exclude) : undefined;
  const outputText = output === 'both';
  const needsPostProcess = !!(excludeSet || stripComments || outputText);

  if (tag) {
    const total = countByTag(html, tag);
    if (keep === 0) {
      return { html: ellipsis + suffix, truncated: total > 0, total, kept: 0 };
    }
    if (keep >= total) {
      const pp = needsPostProcess ? postProcess(html, excludeSet, stripComments, outputText) : { html };
      const result: SplitResult = { html: pp.html, truncated: false, total, kept: total };
      if (pp.text !== undefined) result.text = pp.text;
      return result;
    }
    if (from === 'end') {
      const tail = stripConsumedByTag(html, total - keep, tag);
      const raw = ellipsis + suffix + tail;
      const pp = needsPostProcess ? postProcess(raw, excludeSet, stripComments, outputText) : { html: raw };
      const result: SplitResult = { html: pp.html, truncated: true, total, kept: keep };
      if (pp.text !== undefined) result.text = pp.text;
      return result;
    }
    const tagResult = splitByTag(html, keep, tag, ellipsis, suffix);
    if (needsPostProcess) {
      const pp = postProcess(tagResult.html, excludeSet, stripComments, outputText);
      tagResult.html = pp.html;
      if (pp.text !== undefined) tagResult.text = pp.text;
    }
    return tagResult;
  }

  // Tokenize once, reuse for count + split
  const tokens = tokenize(html);
  const selectiveSet = selectiveTags ? new Set(selectiveTags) : undefined;

  if (keep === 0) {
    const total = countFromTokens(tokens, by);
    return { html: ellipsis + suffix, truncated: total > 0, total, kept: 0 };
  }

  if (from === 'end') {
    const total = countFromTokens(tokens, by);
    if (keep >= total) {
      const result: SplitResult = { html: stripTags ? extractText(tokens) : html, truncated: false, total, kept: total };
      if (outputText) result.text = extractText(tokens);
      return result;
    }
    const tail = stripConsumed(html, total - keep, by);
    const tailTokens = tokenize(tail);
    const result: SplitResult = {
      html: ellipsis + suffix + (stripTags ? extractText(tailTokens) : tail),
      truncated: true,
      total,
      kept: keep,
    };
    if (outputText) result.text = extractText(tailTokens);
    return result;
  }

  // splitFromTokens handles keep >= total internally
  return splitFromTokens(tokens, html, {
    keep, by, ellipsis, suffix, preserveWords, stripTags,
    selectiveTags: selectiveSet, stripComments, smartEllipsis,
    imageWeight, exclude: excludeSet, outputText, wordPattern,
  });
}
