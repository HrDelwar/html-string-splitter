import { attributeValue } from '../parse/tokenizer.js';
import type { DocCore } from './doc.js';
import { docAtoms, type AtomList, type Heading } from './scan.js';
import { resolveSpec } from './unit.js';

export interface Section {
  heading: Heading;
  index: number;
  id?: string;
  slug: string;
  /** Index of the next heading at the same or a higher level, or -1. */
  next: number;
}

export function headingId(doc: DocCore, h: Heading): string | undefined {
  return attributeValue(doc.tokens[h.openTi], 'id') || undefined;
}

/** GitHub-style slug: lowercase, punctuation removed, each space becomes '-'. */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\s-]/gu, '').replace(/\s/g, '-');
}

/** Every heading with its id, a unique slug and where its section ends. */
export function sections(doc: DocCore): { atoms: AtomList; list: Section[] } {
  const atoms = docAtoms(doc, resolveSpec({ by: 'word' }));
  const list: Section[] = atoms.headings.map((heading, index) => ({ heading, index, id: headingId(doc, heading), slug: '', next: -1 }));

  const used = new Set<string>();
  for (const s of list) if (s.id) used.add(s.id);
  for (const s of list) {
    if (s.id) {
      s.slug = s.id;
      continue;
    }
    const base = slugify(s.heading.text) || 'section';
    let slug = base;
    for (let k = 1; used.has(slug); k++) slug = `${base}-${k}`;
    used.add(slug);
    s.slug = slug;
  }

  const open: Section[] = [];
  for (const s of list) {
    while (open.length && open[open.length - 1].heading.level >= s.heading.level) open.pop()!.next = s.index;
    open.push(s);
  }
  return { atoms, list };
}
