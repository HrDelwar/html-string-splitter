import type { SplitAtOptions } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { resolveUnit, isTagUnit } from '../engine/unit.js';
import { countByTag } from '../engine/counter.js';
import { splitFromTokens } from '../engine/truncator.js';
import { splitByTag, stripConsumedByTag } from '../engine/tag-truncator.js';
import { stripConsumed } from '../engine/skipper.js';
import { countFromTokens } from './count.js';

export function splitAt(html: string, options: SplitAtOptions): [string, string] {
  if (!html || typeof html !== 'string') return ['', ''];
  const by = resolveUnit(options.by);
  const at = options.at;
  if (typeof at !== 'number' || at < 0 || !Number.isFinite(at)) return ['', html];

  const tag = isTagUnit(by);

  if (tag) {
    const total = countByTag(html, tag);
    if (at >= total) return [html, ''];
    if (at === 0) return ['', html];
    const before = splitByTag(html, at, tag, '', '');
    const after = stripConsumedByTag(html, at, tag);
    return [before.html, after];
  }

  const tokens = tokenize(html);
  const total = countFromTokens(tokens, by);
  if (at >= total) return [html, ''];
  if (at === 0) return ['', html];

  const before = splitFromTokens(tokens, html, at, by, '', '', false, false);
  const after = stripConsumed(html, at, by);
  return [before.html, after];
}
