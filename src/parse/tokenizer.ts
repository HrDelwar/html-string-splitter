import { Token, TokenType } from '../types.js';
import { decodeEntities } from './entities.js';

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

export const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'noscript', 'xmp', 'iframe', 'noembed', 'noframes']);
const RCDATA_ELEMENTS = new Set(['textarea', 'title']);

const closeRes = new Map<string, RegExp>();

function closeTagRe(tag: string): RegExp {
  let re = closeRes.get(tag);
  if (!re) {
    re = new RegExp(`</${tag}(?=[\\s/>])[^>]*>`, 'gi');
    closeRes.set(tag, re);
  }
  return re;
}

function isAlpha(code: number): boolean {
  const c = code | 32;
  return c >= 97 && c <= 122;
}

interface TokenizerState {
  rawTag: string;
}

/** Find closing '>' respecting quoted attribute values (handles `<a title="a > b">`) */
function findTagEnd(html: string, start: number): number {
  const len = html.length;
  let quote = 0;
  for (let i = start + 1; i < len; i++) {
    const ch = html.charCodeAt(i);
    if (quote) {
      if (ch === quote) quote = 0;
    } else if (ch === 34 || ch === 39) {
      quote = ch;
    } else if (ch === 62) {
      return i;
    }
  }
  return -1;
}

function startsMarkup(s: string, j: number, final: boolean): boolean {
  if (j + 1 >= s.length) return !final;
  const c = s.charCodeAt(j + 1);
  if (c === 33 || c === 63 || isAlpha(c)) return true;
  if (c !== 47) return false;
  if (j + 2 >= s.length) return !final;
  return isAlpha(s.charCodeAt(j + 2));
}

function pushText(out: Token[], raw: string): void {
  if (raw) out.push({ type: TokenType.Text, raw, content: raw });
}

/**
 * Tokenize as much of `s` as possible.
 *
 * @param final When false, incomplete constructs at the end are left unconsumed
 * @return Number of characters consumed
 */
function scan(s: string, final: boolean, state: TokenizerState, out: Token[]): number {
  const len = s.length;
  let i = 0;

  while (i < len) {
    if (state.rawTag) {
      const tag = state.rawTag;
      const re = closeTagRe(tag);
      re.lastIndex = i;
      const m = re.exec(s);
      if (!m) {
        if (!final) return i;
        pushRawBody(out, s.slice(i), tag);
        state.rawTag = '';
        return len;
      }
      if (m.index > i) pushRawBody(out, s.slice(i, m.index), tag);
      out.push({ type: TokenType.CloseTag, raw: m[0], tagName: tag });
      i = m.index + m[0].length;
      state.rawTag = '';
      continue;
    }

    if (s.charCodeAt(i) === 60) {
      if (i + 1 >= len && !final) return i;
      const next = s.charCodeAt(i + 1);

      if (next === 33 || next === 63) {
        if (s.startsWith('<!--', i)) {
          const end = s.indexOf('-->', i + 4);
          if (end === -1) {
            if (!final) return i;
            out.push({ type: TokenType.Comment, raw: s.slice(i) });
            return len;
          }
          out.push({ type: TokenType.Comment, raw: s.slice(i, end + 3) });
          i = end + 3;
          continue;
        }
        if (!final && len - i < 9 && ('<!--'.startsWith(s.slice(i)) || '<![CDATA['.startsWith(s.slice(i)))) return i;
        const cdata = s.startsWith('<![CDATA[', i);
        const end = cdata ? s.indexOf(']]>', i + 9) : s.indexOf('>', i + 2);
        if (end === -1) {
          if (!final) return i;
          pushText(out, s.slice(i));
          return len;
        }
        const stop = cdata ? end + 3 : end + 1;
        out.push({ type: TokenType.Directive, raw: s.slice(i, stop) });
        i = stop;
        continue;
      }

      if (next === 47 && i + 2 < len && isAlpha(s.charCodeAt(i + 2))) {
        const end = s.indexOf('>', i + 2);
        if (end === -1) {
          if (!final) return i;
          pushText(out, s.slice(i));
          return len;
        }
        const nameEnd = s.slice(i + 2, end).search(/[\s/]/);
        const name = nameEnd === -1 ? s.slice(i + 2, end) : s.slice(i + 2, i + 2 + nameEnd);
        out.push({ type: TokenType.CloseTag, raw: s.slice(i, end + 1), tagName: name.toLowerCase() });
        i = end + 1;
        continue;
      }
      if (next === 47 && i + 2 >= len && !final) return i;

      if (isAlpha(next)) {
        const end = findTagEnd(s, i);
        if (end === -1) {
          if (!final) return i;
          pushText(out, s.slice(i));
          return len;
        }
        const raw = s.slice(i, end + 1);
        const inner = raw.slice(1, -1);
        const selfClose = inner.endsWith('/');
        const tagContent = selfClose ? inner.slice(0, -1).trim() : inner.trim();
        const spaceIdx = tagContent.search(/[\s/]/);
        const tagName = (spaceIdx === -1 ? tagContent : tagContent.slice(0, spaceIdx)).toLowerCase();
        const attributes = spaceIdx === -1 ? '' : tagContent.slice(spaceIdx).trim();
        const isSelfClosing = selfClose || VOID_ELEMENTS.has(tagName);

        out.push({
          type: isSelfClosing ? TokenType.SelfClosingTag : TokenType.OpenTag,
          raw,
          tagName,
          attributes: attributes || undefined,
        });
        i = end + 1;
        if (!isSelfClosing && (RAW_TEXT_ELEMENTS.has(tagName) || RCDATA_ELEMENTS.has(tagName))) {
          state.rawTag = tagName;
        }
        continue;
      }
    }

    let j = s.indexOf('<', i + 1);
    while (j !== -1 && !startsMarkup(s, j, final)) j = s.indexOf('<', j + 1);
    let end = j === -1 ? len : j;
    if (!final && j === -1) {
      const amp = s.lastIndexOf('&');
      if (amp >= i && len - amp < 34 && /^&[#\w]*$/.test(s.slice(amp))) end = amp;
      if (end === i) return i;
    }
    pushText(out, s.slice(i, end));
    i = end;
  }
  return i;
}

function pushRawBody(out: Token[], raw: string, tag: string): void {
  if (RCDATA_ELEMENTS.has(tag)) pushText(out, raw);
  else out.push({ type: TokenType.RawContent, raw });
}

export function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  scan(html, true, { rawTag: '' }, tokens);
  return tokens;
}

/** Incremental tokenizer for streamed input. */
export class Tokenizer {
  private buffer = '';
  private state: TokenizerState = { rawTag: '' };

  write(chunk: string): Token[] {
    this.buffer += chunk;
    const out: Token[] = [];
    const used = scan(this.buffer, false, this.state, out);
    this.buffer = this.buffer.slice(used);
    return out;
  }

  end(): Token[] {
    const out: Token[] = [];
    scan(this.buffer, true, this.state, out);
    this.buffer = '';
    return out;
  }
}

const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

/**
 * Decoded value of an attribute on a tag token.
 *
 * @return The value, '' for a bare attribute, or undefined when absent
 */
export function attributeValue(token: Token, name: string): string | undefined {
  const attrs = token.attributes;
  if (!attrs) return undefined;
  ATTRIBUTE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTRIBUTE.exec(attrs)) !== null) {
    if (m[1].toLowerCase() === name) return decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return undefined;
}
