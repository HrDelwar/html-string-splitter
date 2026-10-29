import type { BoundaryLevel, ExcerptOptions, SplitResult } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { cutHead, fullResult, makeCutContext } from '../engine/cut.js';
import { LVL_BLOCK, LVL_SENTENCE, LVL_WORD } from '../engine/scan.js';
import { resolveSpec } from '../engine/unit.js';

const LEVELS: Record<BoundaryLevel, number> = { word: LVL_WORD, sentence: LVL_SENTENCE, block: LVL_BLOCK };

/**
 * Truncate to between `min` and `max` units, ending at the most natural boundary available.
 *
 * @param html HTML string or parsed document
 * @param options `max` is required; `prefer` lists boundaries from best to acceptable
 * @return Same shape as `split()`
 */
export function excerpt(html: HtmlInput, options: ExcerptOptions): SplitResult {
  const doc = toDoc(html);
  const { max, prefer = ['block', 'sentence', 'word'] } = options;
  if (!doc || typeof max !== 'number' || !(max >= 0)) return { html: '', truncated: false, total: 0, kept: 0 };

  const ctx = makeCutContext(doc, resolveSpec(options), { smartEllipsis: true, ...options });
  const { atoms } = ctx;
  if (atoms.total <= max) return fullResult(ctx);

  const min = Math.min(options.min ?? Math.floor(max / 2), max);
  const hi = atoms.lastWithin(max);
  const lo = atoms.firstFrom(min) - 1;

  for (const name of prefer) {
    const level = LEVELS[name];
    if (!level) continue;
    for (let j = hi; j >= Math.max(lo, 0); j--) {
      if (atoms.cum[j] < min) break;
      if (atoms.level(j) >= level && !atoms.isWs(j) && !atoms.inHeading(j)) return cutHead(ctx, j);
    }
  }

  let k = hi;
  while (k > 0 && atoms.isWs(k)) k--;
  return cutHead(ctx, k);
}
