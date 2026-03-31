export type SplitUnit = 'character' | 'word' | 'sentence' | 'line' | 'c' | 'w' | 's' | 'l' | (string & {});

export interface SplitOptions {
  keep: number;
  by?: SplitUnit;
  ellipsis?: string;
  suffix?: string;
  preserveWords?: boolean | number | 'trim';
  stripTags?: boolean;
  selectiveTags?: string[];
  stripComments?: boolean;
  smartEllipsis?: boolean;
  imageWeight?: number;
  exclude?: string[];
  wordPattern?: RegExp;
  output?: 'html' | 'text' | 'both';
  from?: 'start' | 'end';
}

export interface SplitResult {
  html: string;
  truncated: boolean;
  total: number;
  kept: number;
  text?: string;
}

export interface CountOptions {
  by?: SplitUnit;
  wordPattern?: RegExp;
}

export interface ChunkOptions {
  size: number;
  by?: SplitUnit;
  overlap?: number;
  breakAt?: 'word';
}

export interface SplitAtOptions {
  at: number;
  by?: SplitUnit;
}

export interface TextOptions {
  separator?: string;
}

export interface SliceOptions {
  start?: number;
  end?: number;
  by?: SplitUnit;
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

export interface WrapOptions {
  every: number;
  by?: SplitUnit;
  tag?: string;
  className?: string;
  attributes?: Record<string, string>;
}

export interface SummaryResult {
  characters: number;
  words: number;
  sentences: number;
  lines: number;
  blocks: number;
  tags: Record<string, number>;
}

export const enum TokenType {
  OpenTag = 0,
  CloseTag = 1,
  SelfClosingTag = 2,
  Text = 3,
  Comment = 4,
  RawContent = 5,
}

export interface Token {
  type: TokenType;
  raw: string;
  tagName?: string;
  attributes?: string;
  content?: string;
}
