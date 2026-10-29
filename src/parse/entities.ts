const NAMED: Record<string, string> = Object.create(null);

function addRun(start: number, names: string): void {
  names.split(' ').forEach((name, i) => { NAMED[name] = String.fromCodePoint(start + i); });
}

function addPairs(pairs: string): void {
  for (const pair of pairs.split(' ')) {
    const [name, code] = pair.split(':');
    NAMED[name] = String.fromCodePoint(Number(code));
  }
}

addRun(160, 'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml');
addRun(913, 'Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho');
addRun(931, 'Sigma Tau Upsilon Phi Chi Psi Omega');
addRun(945, 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigmaf sigma tau upsilon phi chi psi omega');
addPairs(
  'Tab:9 NewLine:10 excl:33 quot:34 QUOT:34 num:35 dollar:36 percnt:37 amp:38 AMP:38 apos:39 lpar:40 rpar:41 ast:42 plus:43 comma:44 period:46 sol:47 colon:58 semi:59 lt:60 LT:60 equals:61 gt:62 GT:62 quest:63 commat:64 lsqb:91 bsol:92 rsqb:93 Hat:94 lowbar:95 grave:96 lcub:123 verbar:124 rcub:125 ' +
  'COPY:169 REG:174 half:189 centerdot:183 angst:197 OElig:338 oelig:339 Scaron:352 scaron:353 Yuml:376 fnof:402 circ:710 tilde:732 thetasym:977 upsih:978 piv:982 ohm:937 ' +
  'ensp:8194 emsp:8195 emsp13:8196 emsp14:8197 numsp:8199 puncsp:8200 thinsp:8201 ThinSpace:8201 hairsp:8202 ZeroWidthSpace:8203 zwnj:8204 zwj:8205 lrm:8206 rlm:8207 hyphen:8208 dash:8208 ndash:8211 mdash:8212 ' +
  'lsquo:8216 rsquo:8217 sbquo:8218 ldquo:8220 rdquo:8221 bdquo:8222 dagger:8224 Dagger:8225 bull:8226 bullet:8226 nldr:8229 hellip:8230 mldr:8230 permil:8240 prime:8242 Prime:8243 lsaquo:8249 rsaquo:8250 oline:8254 frasl:8260 NoBreak:8288 euro:8364 ' +
  'image:8465 ell:8467 numero:8470 copysr:8471 weierp:8472 real:8476 trade:8482 TRADE:8482 alefsym:8501 ' +
  'larr:8592 leftarrow:8592 uarr:8593 uparrow:8593 rarr:8594 rightarrow:8594 darr:8595 downarrow:8595 harr:8596 crarr:8629 lArr:8656 uArr:8657 rArr:8658 dArr:8659 hArr:8660 ' +
  'forall:8704 part:8706 exist:8707 empty:8709 nabla:8711 isin:8712 notin:8713 ni:8715 prod:8719 sum:8721 minus:8722 lowast:8727 radic:8730 prop:8733 infin:8734 ang:8736 and:8743 or:8744 cap:8745 cup:8746 int:8747 there4:8756 sim:8764 cong:8773 asymp:8776 ne:8800 equiv:8801 le:8804 ge:8805 sub:8834 sup:8835 nsub:8836 sube:8838 supe:8839 oplus:8853 otimes:8855 perp:8869 sdot:8901 ' +
  'lceil:8968 rceil:8969 lfloor:8970 rfloor:8971 frown:8994 smile:8995 squ:9633 square:9633 rect:9645 loz:9674 cir:9675 starf:9733 bigstar:9733 star:9734 phone:9742 female:9792 male:9794 spades:9824 clubs:9827 hearts:9829 diams:9830 flat:9837 natural:9838 sharp:9839 check:10003 checkmark:10003 cross:10007 lang:10216 rang:10217',
);

// Browsers remap numeric references in the C1 range to Windows-1252
const C1_REMAP: Record<number, number> = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018,
  0x92: 0x2019, 0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC,
  0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178,
};

const ENTITY_RE = /&(?:#[xX]([\da-fA-F]+)|#(\d+)|([A-Za-z][A-Za-z\d]*));/g;
const ENTITY_STICKY = /&(?:#[xX]([\da-fA-F]+)|#(\d+)|([A-Za-z][A-Za-z\d]*));/y;

function fromCode(code: number): string {
  if (!Number.isFinite(code) || code === 0 || code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) return '�';
  return String.fromCodePoint(C1_REMAP[code] ?? code);
}

function decodeOne(hex: string | undefined, dec: string | undefined, name: string | undefined): string | undefined {
  if (name !== undefined) return NAMED[name];
  return fromCode(hex !== undefined ? parseInt(hex, 16) : parseInt(dec!, 10));
}

export function decodeEntities(text: string): string {
  if (text.indexOf('&') === -1) return text;
  return text.replace(ENTITY_RE, (match, hex, dec, name) => decodeOne(hex, dec, name) ?? match);
}

/**
 * Map an offset in decoded text back to the matching offset in the raw source.
 *
 * @param raw Raw text as it appears in the HTML
 * @param decodedOffset Offset into `decodeEntities(raw)`
 * @param from Optional cursor to resume from, for repeated forward lookups
 * @return Offset into `raw`
 */
export function rawOffset(raw: string, decodedOffset: number, from?: { raw: number; decoded: number }): number {
  if (decodedOffset <= 0) return 0;
  const first = raw.indexOf('&');
  if (first === -1 || first >= decodedOffset) return Math.min(decodedOffset, raw.length);

  let r = 0;
  let d = 0;
  if (from && from.decoded <= decodedOffset) {
    r = from.raw;
    d = from.decoded;
  }
  const len = raw.length;
  while (d < decodedOffset && r < len) {
    if (raw.charCodeAt(r) === 38) {
      ENTITY_STICKY.lastIndex = r;
      const m = ENTITY_STICKY.exec(raw);
      if (m) {
        const decoded = decodeOne(m[1], m[2], m[3]);
        if (decoded !== undefined) {
          r += m[0].length;
          d += decoded.length;
          continue;
        }
      }
    }
    r++;
    d++;
  }
  if (from) {
    from.raw = r;
    from.decoded = d;
  }
  return r;
}

let graphemeSegmenter: Intl.Segmenter | null | undefined;
const wordSegmenters = new Map<string, Intl.Segmenter | null>();

export function getGraphemeSegmenter(): Intl.Segmenter | null {
  if (graphemeSegmenter === undefined) {
    graphemeSegmenter = typeof Intl !== 'undefined' && Intl.Segmenter
      ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      : null;
  }
  return graphemeSegmenter;
}

export function getWordSegmenter(locale: string): Intl.Segmenter | null {
  let seg = wordSegmenters.get(locale);
  if (seg === undefined) {
    seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(locale, { granularity: 'word' }) : null;
    wordSegmenters.set(locale, seg);
  }
  return seg;
}

// Anything here may form multi-unit graphemes (CRLF, combining marks, surrogates, ZWJ)
export const COMPLEX_TEXT = /[\r̀-￿]/;

export function graphemeLength(text: string): number {
  if (!COMPLEX_TEXT.test(text)) return text.length;
  const seg = getGraphemeSegmenter();
  if (!seg) return [...text].length;
  let count = 0;
  for (const _ of seg.segment(text)) count++;
  return count;
}

export function graphemeSlice(text: string, start: number, end?: number): string {
  if (!COMPLEX_TEXT.test(text)) return text.slice(start, end);
  const seg = getGraphemeSegmenter();
  if (!seg) return [...text].slice(start, end).join('');
  return [...seg.segment(text)].slice(start, end).map(s => s.segment).join('');
}

export function utf8Length(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
