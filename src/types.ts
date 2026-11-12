export type SplitUnit =
  | 'character' | 'word' | 'sentence' | 'line' | 'byte'
  | 'c' | 'w' | 's' | 'l'
  | (string & {});

export type BoundaryLevel = 'word' | 'sentence' | 'block';

export interface UnitOptions {
  by?: SplitUnit;
  wordPattern?: RegExp;
  /** Enables `Intl.Segmenter` word splitting (CJK, Thai, ...) for this locale. */
  locale?: string;
  /** Custom weight per unit, e.g. an LLM token counter. Defaults `by` to `'word'`. */
  measure?: (text: string) => number;
  exclude?: string[];
}

export interface SplitOptions extends UnitOptions {
  keep?: number;
  ellipsis?: string;
  suffix?: string;
  preserveWords?: boolean | number | 'trim';
  stripTags?: boolean;
  selectiveTags?: string[];
  stripComments?: boolean;
  smartEllipsis?: boolean;
  imageWeight?: number;
  output?: 'html' | 'text' | 'both';
  from?: 'start' | 'end';
  /** Maximum length of the returned string, markup included. */
  maxOutputLength?: number;
}

export interface SplitResult {
  html: string;
  truncated: boolean;
  total: number;
  kept: number;
  text?: string;
}

export interface CountOptions extends UnitOptions {
  imageWeight?: number;
}

export interface ChunkOptions extends UnitOptions {
  size: number;
  overlap?: number;
  breakAt?: BoundaryLevel;
  meta?: boolean;
  stripComments?: boolean;
}

export interface ChunkResult {
  html: string;
  text: string;
  index: number;
  start: number;
  end: number;
  headings: string[];
  /** `id` of the nearest enclosing heading that has one, for linking to the source. */
  anchor?: string;
}

export interface OutlineOptions {
  /** Deepest heading level to list (default 6). */
  maxLevel?: number;
}

export interface OutlineItem {
  level: number;
  text: string;
  /** The heading's `id` attribute. */
  id?: string;
  /** `id` when present, otherwise a unique slug of the text. */
  slug: string;
  /** Position among all headings in the document, accepted by `section()`. */
  index: number;
  /** Words in the section, subsections included and the heading itself excluded. */
  words: number;
  children: OutlineItem[];
}

export interface SectionOptions {
  includeHeading?: boolean;
}

export interface SplitAtOptions extends UnitOptions {
  at: number;
}

export interface TextOptions {
  separator?: string;
}

export interface SliceOptions extends UnitOptions {
  start?: number;
  end?: number;
}

export interface PickOptions {
  tag?: string;
  text?: string | RegExp;
  limit?: number;
}

export interface PickResult {
  html: string;
  text: string;
  start: number;
  end: number;
}

export interface HighlightOptions {
  tag?: string;
  className?: string;
  attributes?: Record<string, string>;
}

export interface Annotation extends HighlightOptions {
  /** Offset into `text(html, { separator })`. */
  start: number;
  end: number;
}

export interface AnnotateOptions extends HighlightOptions {
  /** Must match the separator the offsets were computed with. */
  separator?: string;
}

export interface WrapOptions extends UnitOptions {
  every: number;
  tag?: string;
  className?: string;
  attributes?: Record<string, string>;
}

export interface ExcerptOptions extends Omit<SplitOptions, 'keep' | 'from' | 'preserveWords' | 'maxOutputLength'> {
  max: number;
  min?: number;
  prefer?: BoundaryLevel[];
}

export interface SnippetOptions extends UnitOptions {
  radius?: number;
  maxSnippets?: number;
  separator?: string;
  ellipsis?: string;
  highlight?: boolean | HighlightOptions;
  stripTags?: boolean;
}

export interface SummaryOptions {
  wordsPerMinute?: number;
}

export interface SummaryResult {
  characters: number;
  words: number;
  sentences: number;
  lines: number;
  blocks: number;
  tags: Record<string, number>;
  readingTime: number;
}

export interface StreamOptions extends UnitOptions {
  keep: number;
  ellipsis?: string;
  suffix?: string;
  stripTags?: boolean;
  selectiveTags?: string[];
  stripComments?: boolean;
  smartEllipsis?: boolean;
  imageWeight?: number;
}

export interface StreamSplitter {
  write(chunk: string): string;
  end(): string;
  readonly done: boolean;
  readonly truncated: boolean;
  readonly kept: number;
}

export const TokenType = {
  OpenTag: 0,
  CloseTag: 1,
  SelfClosingTag: 2,
  Text: 3,
  Comment: 4,
  RawContent: 5,
  Directive: 6,
} as const;

export type TokenType = (typeof TokenType)[keyof typeof TokenType];

export interface Token {
  type: TokenType;
  raw: string;
  tagName?: string;
  attributes?: string;
  content?: string;
}
