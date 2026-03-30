import type { SliceOptions } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { resolveUnit, isTagUnit } from '../engine/unit.js';
import { countByTag } from '../engine/counter.js';
import { splitCore } from '../engine/truncator.js';
import { splitByTag, stripConsumedByTag } from '../engine/tag-truncator.js';
import { stripConsumed } from '../engine/skipper.js';
import { countFromTokens } from './count.js';

export function slice(html: string, options?: SliceOptions): string {
  if (!html || typeof html !== 'string') return '';
  const by = resolveUnit(options?.by);
  const tag = isTagUnit(by);

  const total = tag ? countByTag(html, tag) : countFromTokens(tokenize(html), by);

  let start = options?.start ?? 0;
  let end = options?.end ?? total;

  if (start < 0) start = Math.max(0, total + start);
  if (end < 0) end = Math.max(0, total + end);
  end = Math.min(end, total);

  if (start >= end || start >= total) return '';

  let remaining = html;
  if (start > 0) {
    remaining = tag
      ? stripConsumedByTag(html, start, tag)
      : stripConsumed(html, start, by);
  }

  const take = end - start;
  if (tag) {
    return splitByTag(remaining, take, tag, '', '').html;
  }
  return splitCore(remaining, take, by, '', '', false, false).html;
}
