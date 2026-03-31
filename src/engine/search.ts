export function buildRegex(query: string | RegExp): RegExp {
  if (typeof query === 'string') {
    return new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  }
  return new RegExp(query.source, query.flags.includes('g') ? query.flags : query.flags + 'g');
}

export function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
