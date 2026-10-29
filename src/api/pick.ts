import type { PickOptions, PickResult } from '../types.js';
import { TokenType } from '../types.js';
import { toDoc, type DocCore, type HtmlInput } from '../engine/doc.js';
import { render } from '../engine/emit.js';
import { PlainText } from '../engine/plain.js';

export function pick(html: HtmlInput, options: PickOptions): PickResult[] {
  const doc = toDoc(html);
  if (!doc) return [];

  const { tag, text: query, limit } = options;
  if (!tag && !query) return [];

  const results = tag ? pickByTag(doc, tag) : pickByText(doc, query!);
  return limit ? results.slice(0, limit) : results;
}

function pickByTag(doc: DocCore, tagName: string): PickResult[] {
  const { tokens, decoded } = doc;
  const results: PickResult[] = [];
  const tag = tagName.toLowerCase();
  let idx = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === TokenType.SelfClosingTag && token.tagName === tag) {
      results.push({ html: token.raw, text: '', start: idx, end: idx + 1 });
      idx++;
      continue;
    }

    if (token.type === TokenType.OpenTag && token.tagName === tag) {
      let depth = 1;
      let raw = token.raw;
      let plainText = '';

      for (let j = i + 1; j < tokens.length && depth > 0; j++) {
        const t = tokens[j];
        raw += t.raw;
        if (t.type === TokenType.OpenTag && t.tagName === tag) depth++;
        if (t.type === TokenType.CloseTag && t.tagName === tag) depth--;
        if (depth > 0 && t.type === TokenType.Text) plainText += decoded[j];
      }

      results.push({ html: raw, text: plainText, start: idx, end: idx + 1 });
      idx++;
    }
  }

  return results;
}

function pickByText(doc: DocCore, query: string | RegExp): PickResult[] {
  const plain = new PlainText(doc);
  return plain.matches(query).map(m => {
    const r = render(doc.tokens, doc.decoded, m.mark.s, m.mark.e, {});
    return { html: r.html + r.closers, text: m.text, start: m.start, end: m.end };
  });
}
