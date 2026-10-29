import type { SplitOptions, SplitResult } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { resolveSpec } from '../engine/unit.js';
import { cutHead, cutTail, fitOutput, fullResult, headEnd, makeCutContext, tailStart } from '../engine/cut.js';

const empty = (): SplitResult => ({ html: '', truncated: false, total: 0, kept: 0 });

export function split(html: HtmlInput, options: SplitOptions): SplitResult {
  const doc = toDoc(html);
  if (!doc) return empty();

  const max = options.maxOutputLength;
  const keep = options.keep ?? (max != null ? Infinity : undefined);
  if (typeof keep !== 'number' || Number.isNaN(keep) || keep < 0 || (keep === Infinity && max == null)) {
    return empty();
  }

  const ctx = makeCutContext(doc, resolveSpec(options), options);
  const total = ctx.atoms.total;
  const fromEnd = options.from === 'end';
  const preserveWords = options.preserveWords ?? false;

  if (keep === 0 && max == null) {
    return { html: ctx.ellipsis + ctx.suffix, truncated: total > 0, total, kept: 0 };
  }

  let result: SplitResult;
  if (keep >= total) result = fullResult(ctx);
  else if (fromEnd) result = cutTail(ctx, tailStart(ctx, keep, preserveWords));
  else result = cutHead(ctx, headEnd(ctx, keep, preserveWords));

  if (max != null && result.html.length > max) {
    result = fitOutput(ctx, keep, max, fromEnd, preserveWords);
  }
  return result;
}
