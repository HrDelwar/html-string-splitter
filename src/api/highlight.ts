import type { HighlightOptions } from '../types.js';
import { TokenType } from '../types.js';
import { tokenize } from '../parse/tokenizer.js';
import { decodeEntities } from '../parse/entities.js';
import { updateNonVisibleDepth } from '../engine/visibility.js';
import { buildRegex, buildOpenTag } from '../engine/search.js';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlight(html: string, query: string | RegExp, options?: HighlightOptions): string {
  if (!html || typeof html !== 'string' || !query) return html || '';

  const { tag = 'mark', className, attributes } = options || {};
  const tokens = tokenize(html);

  const segments: { tokenIdx: number; decoded: string }[] = [];
  let plainText = '';
  let nvDepth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    nvDepth = updateNonVisibleDepth(token, nvDepth);
    if (nvDepth > 0) continue;
    if (token.type === TokenType.Text && token.content) {
      const decoded = decodeEntities(token.content);
      segments.push({ tokenIdx: i, decoded });
      plainText += decoded;
    }
  }

  if (!plainText) return html;

  const regex = buildRegex(query);
  const matches: { start: number; end: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(plainText)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length });
    if (match[0].length === 0) regex.lastIndex++;
  }

  if (matches.length === 0) return html;

  const openTag = buildOpenTag(tag, className, attributes);
  const closeTag = `</${tag}>`;

  let plainOffset = 0;
  const segHighlights = new Map<number, { localStart: number; localEnd: number }[]>();

  for (const seg of segments) {
    const segStart = plainOffset;
    const segEnd = plainOffset + seg.decoded.length;

    for (const m of matches) {
      if (m.end <= segStart || m.start >= segEnd) continue;
      const localStart = Math.max(0, m.start - segStart);
      const localEnd = Math.min(seg.decoded.length, m.end - segStart);
      if (!segHighlights.has(seg.tokenIdx)) segHighlights.set(seg.tokenIdx, []);
      segHighlights.get(seg.tokenIdx)!.push({ localStart, localEnd });
    }
    plainOffset = segEnd;
  }

  let output = '';
  for (let i = 0; i < tokens.length; i++) {
    const highlights = segHighlights.get(i);
    if (!highlights || highlights.length === 0) {
      output += tokens[i].raw;
      continue;
    }

    const decoded = decodeEntities(tokens[i].content!);
    let lastEnd = 0;
    for (const h of highlights) {
      output += escapeHtml(decoded.slice(lastEnd, h.localStart));
      output += openTag + escapeHtml(decoded.slice(h.localStart, h.localEnd)) + closeTag;
      lastEnd = h.localEnd;
    }
    output += escapeHtml(decoded.slice(lastEnd));
  }

  return output;
}
