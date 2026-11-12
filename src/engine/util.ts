/** A position in a token stream: token index plus offset into that token's decoded text. */
export interface Pos {
  ti: number;
  off: number;
}

export function cmpPos(a: Pos, b: Pos): number {
  return a.ti !== b.ti ? a.ti - b.ti : a.off - b.off;
}

/**
 * Binary search for the first index in [lo, hi) where `pred` turns true.
 *
 * @param pred Must be monotonic: false...false, true...true
 * @return The first matching index, or `hi` when none match
 */
export function firstIndex(lo: number, hi: number, pred: (i: number) => boolean): number {
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pred(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export function isBlank(text: string): boolean {
  return !/\S/.test(text);
}

export function isPositive(n: unknown): n is number {
  return typeof n === 'number' && n > 0 && Number.isFinite(n);
}

export function isNonNegative(n: unknown): n is number {
  return typeof n === 'number' && n >= 0 && Number.isFinite(n);
}

export function toTagSet(names: string[] | undefined): Set<string> | undefined {
  return names ? new Set(names.map(n => n.toLowerCase())) : undefined;
}
