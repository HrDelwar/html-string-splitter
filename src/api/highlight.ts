import type { HighlightOptions } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { render } from '../engine/emit.js';
import { PlainText } from '../engine/plain.js';
import { tagPair } from '../engine/search.js';

export function highlight(html: HtmlInput, query: string | RegExp, options?: HighlightOptions): string {
  const doc = toDoc(html);
  if (!doc) return typeof html === 'string' ? html : '';
  if (!query) return doc.html;

  const matches = new PlainText(doc).matches(query);
  if (matches.length === 0) return doc.html;

  const [markOpen, markClose] = tagPair('mark', options);
  return render(doc, undefined, undefined, { marks: matches.map(m => m.mark), markOpen, markClose }).html;
}
