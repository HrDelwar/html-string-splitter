import type { PickOptions, PickResult } from '../types.js';
import { TokenType } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { decodeEntities } from '../parse/entities.js';
import { updateNonVisibleDepth } from '../engine/visibility.js';
import { buildRegex } from '../engine/search.js';
import { slice } from './slice.js';

export function pick(html: string, options: PickOptions): PickResult[] {
  if (!html || typeof html !== 'string') return [];

  const { tag, text: query, limit } = options;
  if (!tag && !query) return [];

  const results = tag ? pickByTag(html, tag) : pickByText(html, query!);
  return limit ? results.slice(0, limit) : results;
}

function pickByTag(html: string, tagName: string): PickResult[] {
  const tokens = tokenize(html);
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
        if (depth > 0 && t.type === TokenType.Text && t.content) {
          plainText += decodeEntities(t.content);
        }
      }

      results.push({ html: raw, text: plainText, start: idx, end: idx + 1 });
      idx++;
    }
  }

  return results;
}

function pickByText(html: string, query: string | RegExp): PickResult[] {
  const tokens = tokenize(html);
  let plainText = '';
  let nvDepth = 0;

  for (const token of tokens) {
    nvDepth = updateNonVisibleDepth(token, nvDepth);
    if (nvDepth > 0) continue;
    if (token.type === TokenType.Text && token.content) {
      plainText += decodeEntities(token.content);
    }
  }

  if (!plainText) return [];

  const regex = buildRegex(query);
  const results: PickResult[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(plainText)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    results.push({
      html: slice(html, { start, end, by: 'c' }),
      text: match[0],
      start,
      end,
    });
    if (match[0].length === 0) regex.lastIndex++;
  }

  return results;
}
