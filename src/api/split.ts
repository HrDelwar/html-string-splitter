import type { SplitOptions, SplitResult } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { resolveUnit, isTagUnit } from '../engine/unit.js';
import { countByTag } from '../engine/counter.js';
import { splitFromTokens } from '../engine/truncator.js';
import { splitByTag, stripConsumedByTag } from '../engine/tag-truncator.js';
import { stripConsumed } from '../engine/skipper.js';
import { extractText } from '../engine/extractor.js';
import { countFromTokens } from './count.js';

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
    stripTags = false,
    from = 'start',
  } = options;
  const by = resolveUnit(rawBy);

  if (typeof keep !== 'number' || keep < 0 || !Number.isFinite(keep)) {
    return { html: '', truncated: false, total: 0, kept: 0 };
  }

  const tag = isTagUnit(by);
  const ellipsis = rawEllipsis ?? (tag ? '' : '...');

  if (tag) {
    const total = countByTag(html, tag);
    if (keep === 0) {
      return { html: ellipsis + suffix, truncated: total > 0, total, kept: 0 };
    }
    if (keep >= total) {
      return { html, truncated: false, total, kept: total };
    }
    if (from === 'end') {
      const tail = stripConsumedByTag(html, total - keep, tag);
      return { html: ellipsis + suffix + tail, truncated: true, total, kept: keep };
    }
    return splitByTag(html, keep, tag, ellipsis, suffix);
  }

  // Tokenize once, reuse for count + split
  const tokens = tokenize(html);

  if (keep === 0) {
    const total = countFromTokens(tokens, by);
    return { html: ellipsis + suffix, truncated: total > 0, total, kept: 0 };
  }

  if (from === 'end') {
    const total = countFromTokens(tokens, by);
    if (keep >= total) {
      return { html: stripTags ? extractText(tokens) : html, truncated: false, total, kept: total };
    }
    const tail = stripConsumed(html, total - keep, by);
    return {
      html: ellipsis + suffix + (stripTags ? extractText(tokenize(tail)) : tail),
      truncated: true,
      total,
      kept: keep,
    };
  }

  // splitFromTokens handles keep >= total internally
  return splitFromTokens(tokens, html, keep, by, ellipsis, suffix, preserveWords, stripTags);
}
