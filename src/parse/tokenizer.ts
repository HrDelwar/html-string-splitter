import { Token, TokenType } from '../types.js';

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const RAW_TEXT_ELEMENTS = new Set(['style', 'script', 'noscript']);

export function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  const len = html.length;
  let i = 0;

  while (i < len) {
    if (html[i] === '<') {
      if (html.startsWith('<!--', i)) {
        const end = html.indexOf('-->', i + 4);
        if (end === -1) {
          tokens.push({ type: TokenType.Comment, raw: html.slice(i) });
          break;
        }
        tokens.push({ type: TokenType.Comment, raw: html.slice(i, end + 3) });
        i = end + 3;
        continue;
      }

      if (html[i + 1] === '/') {
        const end = html.indexOf('>', i + 2);
        if (end === -1) {
          tokens.push({ type: TokenType.Text, raw: html.slice(i), content: html.slice(i) });
          break;
        }
        const raw = html.slice(i, end + 1);
        const tagName = html.slice(i + 2, end).trim().toLowerCase();
        tokens.push({ type: TokenType.CloseTag, raw, tagName });
        i = end + 1;
        continue;
      }

      const end = findTagEnd(html, i);
      if (end === -1) {
        tokens.push({ type: TokenType.Text, raw: html.slice(i), content: html.slice(i) });
        break;
      }
      const raw = html.slice(i, end + 1);
      const inner = raw.slice(1, -1);
      const selfClose = inner.endsWith('/');
      const tagContent = selfClose ? inner.slice(0, -1).trim() : inner.trim();

      const spaceIdx = tagContent.search(/[\s/]/);
      const tagName = (spaceIdx === -1 ? tagContent : tagContent.slice(0, spaceIdx)).toLowerCase();
      const attributes = spaceIdx === -1 ? '' : tagContent.slice(spaceIdx).trim();

      const isSelfClosing = selfClose || VOID_ELEMENTS.has(tagName);
      tokens.push({
        type: isSelfClosing ? TokenType.SelfClosingTag : TokenType.OpenTag,
        raw,
        tagName,
        attributes: attributes || undefined,
      });
      i = end + 1;

      if (!isSelfClosing && RAW_TEXT_ELEMENTS.has(tagName)) {
        const closePattern = `</${tagName}>`;
        const closeIdx = html.toLowerCase().indexOf(closePattern, i);
        if (closeIdx !== -1) {
          const rawContent = html.slice(i, closeIdx);
          if (rawContent) {
            tokens.push({ type: TokenType.RawContent, raw: rawContent });
          }
          const closeRaw = html.slice(closeIdx, closeIdx + closePattern.length);
          tokens.push({ type: TokenType.CloseTag, raw: closeRaw, tagName });
          i = closeIdx + closePattern.length;
        }
      }
      continue;
    }

    const nextTag = html.indexOf('<', i);
    const textEnd = nextTag === -1 ? len : nextTag;
    const raw = html.slice(i, textEnd);
    tokens.push({ type: TokenType.Text, raw, content: raw });
    i = textEnd;
  }

  return tokens;
}

/** Find closing '>' respecting quoted attribute values (handles `<a title="a > b">`) */
function findTagEnd(html: string, start: number): number {
  const len = html.length;
  let i = start + 1;
  let inSingle = false;
  let inDouble = false;

  while (i < len) {
    const ch = html[i];
    if (inSingle) {
      if (ch === "'") inSingle = false;
    } else if (inDouble) {
      if (ch === '"') inDouble = false;
    } else if (ch === "'") {
      inSingle = true;
    } else if (ch === '"') {
      inDouble = true;
    } else if (ch === '>') {
      return i;
    }
    i++;
  }
  return -1;
}
