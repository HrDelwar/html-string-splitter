# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

npm package (`html-string-splitter` v2) that splits/truncates HTML strings by character, word, sentence, or element count while preserving valid HTML structure. Zero dependencies. TypeScript with dual ESM + CJS output.

## Architecture

```
src/
  types.ts       — All TypeScript interfaces, enums (SplitOptions, SplitResult, Token, etc.)
  tokenizer.ts   — Single-pass HTML tokenizer (char-by-char walk, handles nested/self-closing/comments)
  entities.ts    — HTML entity decoding, grapheme-aware counting via Intl.Segmenter
  splitter.ts    — Core logic: text-based + element-based split/count/chunk/splitAt/slice/text
  index.ts       — Public exports + deprecated v1 wrapper functions
```

Two counting modes:
- **Text-based** (`character/c`, `word/w`, `sentence/s`): counts decoded text, uses grapheme segmenter, skips non-visible elements
- **Element-based** (any other string like `p`, `li`, `tr`, `img`): counts HTML tag occurrences

Data flow: `html` → `tokenize()` → `Token[]` → counting/splitting with tag stack for balanced output.

## Commands

- **Build**: `npm run build` (tsup → `dist/` with ESM, CJS, `.d.ts`)
- **Dev**: `npm run dev` (tsup watch)
- **Test**: `npm test` (vitest — 159 tests across 3 files)
- **Test watch**: `npm run test:watch`
- **Coverage**: `npm run test:coverage`
- **Type check**: `npm run typecheck`

## Key Design Decisions

- `split()` uses `keep` (not `count`) as the property name for number of units
- `by` accepts text units (`c/w/s`) or any tag name (`p`, `li`, `tr`) — non-text units trigger element-based mode
- Non-visible elements (style, script, head, title, template) preserved in output but not counted
- After truncation, everything is dropped (clean cut) — no preserveTags option
- Library policy: output is always shorter than or equal to input. It's a splitter, not a formatter.
