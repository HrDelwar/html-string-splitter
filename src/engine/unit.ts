import type { SplitUnit } from '../types.js';

const UNIT_ALIASES: Record<string, SplitUnit> = {
  c: 'character', character: 'character',
  w: 'word', word: 'word',
  s: 'sentence', sentence: 'sentence',
};

const TEXT_UNITS = new Set(['character', 'word', 'sentence', 'c', 'w', 's']);

export function resolveUnit(by: SplitUnit | undefined): SplitUnit {
  if (!by) return 'character';
  return UNIT_ALIASES[by] ?? by;
}

export function isTagUnit(by: SplitUnit): string | null {
  if (!by || TEXT_UNITS.has(by)) return null;
  return by.toLowerCase();
}
