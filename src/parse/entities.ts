const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: '\u00A0', copy: '\u00A9', reg: '\u00AE', trade: '\u2122',
  mdash: '\u2014', ndash: '\u2013', laquo: '\u00AB', raquo: '\u00BB',
  bull: '\u2022', hellip: '\u2026', prime: '\u2032', Prime: '\u2033',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D',
  dollar: '$', euro: '\u20AC', pound: '\u00A3', yen: '\u00A5', cent: '\u00A2',
  frac12: '\u00BD', frac14: '\u00BC', frac34: '\u00BE',
  times: '\u00D7', divide: '\u00F7', deg: '\u00B0', micro: '\u00B5',
  para: '\u00B6', middot: '\u00B7', hearts: '\u2665', spades: '\u2660',
  clubs: '\u2663', diams: '\u2666',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[\da-fA-F]+|#\d+|\w+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = parseInt(entity.slice(2), 16);
      return isNaN(code) ? match : String.fromCodePoint(code);
    }
    if (entity.startsWith('#')) {
      const code = parseInt(entity.slice(1), 10);
      return isNaN(code) ? match : String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

export function graphemeLength(text: string): number {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    let count = 0;
    for (const _ of segmenter.segment(text)) {
      count++;
    }
    return count;
  }
  return [...text].length;
}

export function graphemeSlice(text: string, start: number, end?: number): string {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    const segments = [...segmenter.segment(text)];
    return segments.slice(start, end).map(s => s.segment).join('');
  }
  return [...text].slice(start, end).join('');
}
