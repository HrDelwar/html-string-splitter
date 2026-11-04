import type { OutlineItem, OutlineOptions, SectionOptions } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { renderBalanced } from '../engine/emit.js';
import { sections, type Section } from '../engine/sections.js';

/**
 * Heading tree of a document.
 *
 * @param html HTML string or parsed document
 * @param options `maxLevel` limits how deep the tree goes
 * @return Top-level headings with nested `children`
 */
export function outline(html: HtmlInput, options?: OutlineOptions): OutlineItem[] {
  const doc = toDoc(html);
  if (!doc) return [];
  const maxLevel = options?.maxLevel ?? 6;
  const { atoms, list } = sections(doc);
  const roots: OutlineItem[] = [];
  const stack: OutlineItem[] = [];

  for (const s of list) {
    const h = s.heading;
    if (h.level > maxLevel) continue;
    const endAtom = s.next === -1 ? atoms.n : list[s.next].heading.start;
    const item: OutlineItem = {
      level: h.level,
      text: h.text,
      ...(s.id ? { id: s.id } : {}),
      slug: s.slug,
      index: s.index,
      words: atoms.cumBefore(endAtom) - atoms.cumBefore(h.end),
      children: [],
    };
    while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
    (stack.length ? stack[stack.length - 1].children : roots).push(item);
    stack.push(item);
  }
  return roots;
}

/**
 * Balanced HTML of one section: a heading and everything up to the next heading of the same or a higher level.
 *
 * @param html HTML string or parsed document
 * @param target Heading `id`, slug or text, or its `index` from `outline()`
 * @param options `includeHeading: false` returns only the content
 * @return The section, or '' when no heading matches
 */
export function section(html: HtmlInput, target: string | number, options?: SectionOptions): string {
  const doc = toDoc(html);
  if (!doc) return '';
  const { list } = sections(doc);
  const s = typeof target === 'number' ? list[target] : find(list, target);
  if (!s) return '';

  const h = s.heading;
  const fromTi = options?.includeHeading === false ? h.closeTi + 1 : h.openTi;
  const toTi = s.next === -1 ? doc.tokens.length : list[s.next].heading.openTi;
  if (fromTi >= toTi) return '';
  const to = s.next === -1 ? undefined : { ti: toTi, off: 0 };
  return renderBalanced(doc, { ti: fromTi, off: 0 }, to, {}).html;
}

function find(list: Section[], target: string): Section | undefined {
  if (typeof target !== 'string') return undefined;
  const text = target.trim().toLowerCase();
  return list.find(s => s.id === target) ?? list.find(s => s.slug === target) ?? list.find(s => s.heading.text.toLowerCase() === text);
}
