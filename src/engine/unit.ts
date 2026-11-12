import type { SplitUnit, UnitOptions } from '../types.js';
import { toTagSet } from './util.js';

const UNIT_ALIASES: Record<string, SplitUnit> = {
  c: 'character', character: 'character',
  w: 'word', word: 'word',
  s: 'sentence', sentence: 'sentence',
  l: 'line', line: 'line',
  byte: 'byte',
};

const TEXT_UNITS = new Set(['character', 'word', 'sentence', 'line', 'byte', 'c', 'w', 's', 'l']);

export function resolveUnit(by: SplitUnit | undefined): SplitUnit {
  if (!by) return 'character';
  return UNIT_ALIASES[by] ?? by;
}

export function isTagUnit(by: SplitUnit): string | null {
  if (!by || TEXT_UNITS.has(by)) return null;
  return by.toLowerCase();
}

export interface UnitSpec {
  by: string;
  tag: string | null;
  wordPattern?: RegExp;
  locale?: string;
  measure?: (text: string) => number;
  imageWeight: number;
  exclude?: Set<string>;
}

export function resolveSpec(options: UnitOptions & { imageWeight?: number } | undefined): UnitSpec {
  const o = options ?? {};
  const by = resolveUnit(o.by ?? (o.measure ? 'word' : 'character'));
  const tag = isTagUnit(by);
  let wordPattern = o.wordPattern;
  if (wordPattern && !wordPattern.global) wordPattern = new RegExp(wordPattern.source, wordPattern.flags + 'g');
  return {
    by: tag ? 'tag' : by,
    tag,
    wordPattern,
    locale: o.locale,
    measure: o.measure,
    imageWeight: tag || by === 'line' ? 0 : (o.imageWeight ?? 0),
    exclude: o.exclude?.length ? toTagSet(o.exclude) : undefined,
  };
}

export function specKey(spec: UnitSpec): string {
  const ex = spec.exclude ? [...spec.exclude].sort().join(',') : '';
  const wp = spec.wordPattern ? `${spec.wordPattern.source}/${spec.wordPattern.flags}` : '';
  return `${spec.by}|${spec.tag ?? ''}|${wp}|${spec.locale ?? ''}|${spec.imageWeight}|${ex}`;
}
