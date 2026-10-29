import type {
  ChunkOptions, ChunkResult, CountOptions, HighlightOptions, PickOptions, PickResult,
  SliceOptions, SplitAtOptions, SplitOptions, SplitResult, SummaryOptions, SummaryResult,
  TextOptions, WrapOptions,
} from './types.js';
import { DocCore } from './engine/doc.js';
import {
  chunk, clip, count, highlight, pick, slice, split, splitAt, summary, text, wrap,
} from './api/index.js';

/** Parsed HTML that reuses tokens and unit indexes across calls. */
export class HtmlDocument extends DocCore {
  split(options: SplitOptions): SplitResult { return split(this, options); }
  clip(options: SplitOptions): string { return clip(this, options); }
  count(options?: CountOptions): number { return count(this, options); }
  text(options?: TextOptions): string { return text(this, options); }
  splitAt(options: SplitAtOptions): [string, string] { return splitAt(this, options); }
  slice(options?: SliceOptions): string { return slice(this, options); }
  chunk(options: ChunkOptions & { meta: true }): ChunkResult[];
  chunk(options: ChunkOptions): string[];
  chunk(options: ChunkOptions): string[] | ChunkResult[] { return chunk(this, options); }
  summary(options?: SummaryOptions): SummaryResult { return summary(this, options); }
  pick(options: PickOptions): PickResult[] { return pick(this, options); }
  highlight(query: string | RegExp, options?: HighlightOptions): string { return highlight(this, query, options); }
  wrap(options: WrapOptions): string { return wrap(this, options); }
}

/**
 * Parse once, run many operations without re-tokenizing.
 *
 * @param html HTML string
 * @return Parsed document accepted by every function in this package
 */
export function parse(html: string): HtmlDocument {
  return new HtmlDocument(html);
}
