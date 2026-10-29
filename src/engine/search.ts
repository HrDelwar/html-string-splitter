import type { HighlightOptions } from '../types.js';
import { escapeHtml } from '../parse/entities.js';

export function buildRegex(query: string | RegExp): RegExp {
  if (typeof query === 'string') {
    return new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  }
  return new RegExp(query.source, query.flags.includes('g') ? query.flags : query.flags + 'g');
}

export function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

export function buildOpenTag(tag: string, className?: string, attributes?: Record<string, string>): string {
  let s = `<${tag}`;
  if (className) s += ` class="${escapeAttr(className)}"`;
  if (attributes) {
    for (const [k, v] of Object.entries(attributes)) {
      const safeKey = k.replace(/[^a-zA-Z0-9\-_]/g, '');
      if (safeKey) s += ` ${safeKey}="${escapeAttr(v)}"`;
    }
  }
  return s + '>';
}

/** Opening and closing markup for a wrapper element. */
export function tagPair(defaultTag: string, o: HighlightOptions = {}): [string, string] {
  const tag = o.tag ?? defaultTag;
  return [buildOpenTag(tag, o.className, o.attributes), `</${tag}>`];
}
