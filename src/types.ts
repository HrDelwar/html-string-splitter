export type SplitUnit = 'character' | 'word' | 'sentence' | 'c' | 'w' | 's' | (string & {});

export interface SplitOptions {
  keep: number;
  by?: SplitUnit;
  ellipsis?: string;
  suffix?: string;
  preserveWords?: boolean;
  stripTags?: boolean;
  from?: 'start' | 'end';
}

export interface SplitResult {
  html: string;
  truncated: boolean;
  total: number;
  kept: number;
}

export interface CountOptions {
  by?: SplitUnit;
}

export interface ChunkOptions {
  size: number;
  by?: SplitUnit;
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
