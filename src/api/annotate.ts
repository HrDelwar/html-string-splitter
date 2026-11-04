import type { AnnotateOptions, Annotation } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { render, type Mark } from '../engine/emit.js';
import { PlainText } from '../engine/plain.js';
import { tagPair } from '../engine/search.js';

/**
 * Wrap plain-text ranges in markup, e.g. entities found by an NLP model in `text(html)`.
 *
 * @param html HTML string or parsed document
 * @param annotations Ranges as offsets into `text(html, { separator })`; they may nest or overlap
 * @param options Default `tag`, `className` and `attributes`, and the `separator` used for offsets
 * @return HTML with every range wrapped, split at element boundaries where needed
 */
export function annotate(html: HtmlInput, annotations: Annotation[], options?: AnnotateOptions): string {
  const doc = toDoc(html);
  if (!doc) return typeof html === 'string' ? html : '';
  if (!Array.isArray(annotations) || annotations.length === 0) return doc.html;

  const plain = new PlainText(doc, options?.separator);
  const len = plain.text.length;
  if (len === 0) return doc.html;

  const ranges: { start: number; end: number; a: Annotation }[] = [];
  for (const a of annotations) {
    if (!a || !Number.isFinite(a.start) || !Number.isFinite(a.end)) continue;
    const start = Math.max(0, a.start);
    const end = Math.min(len, a.end);
    if (start < end) ranges.push({ start, end, a });
  }
  if (ranges.length === 0) return doc.html;
  ranges.sort((x, y) => x.start - y.start || y.end - x.end);

  const defaultTag = options?.tag ?? 'mark';
  const marks: Mark[] = ranges.map(({ start, end, a }) => {
    const [open, close] = tagPair(defaultTag, {
      tag: a.tag,
      className: a.className ?? options?.className,
      attributes: options?.attributes || a.attributes ? { ...options?.attributes, ...a.attributes } : undefined,
    });
    return { s: plain.pos(start), e: plain.pos(end, true), open, close };
  });
  return render(doc, undefined, undefined, { marks }).html;
}
