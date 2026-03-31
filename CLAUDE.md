# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

npm package (`html-string-splitter` v2.1) that splits/truncates HTML strings by character, word, sentence, line, or element count while preserving valid HTML structure. Zero dependencies. TypeScript with dual ESM + CJS output.

## Architecture

```
src/
  types.ts          — All TypeScript interfaces, enums (SplitOptions, SplitResult, Token, etc.)
  index.ts          — Public exports + deprecated v1 wrapper functions
  parse/
    tokenizer.ts    — Single-pass HTML tokenizer (char-by-char, handles nested/self-closing/comments)
    entities.ts     — HTML entity decoding, grapheme-aware counting via Intl.Segmenter
  engine/
    truncator.ts    — Core splitting logic with TruncateOptions object, tag stack for balanced output
    tag-truncator.ts — Tag-based splitting (splitByTag, stripConsumedByTag)
    counter.ts      — textToUnits(), countUnits(), countByTag() — supports optional wordPattern
    skipper.ts      — stripConsumed() — skip N units, return remainder
    extractor.ts    — extractText() — plain text extraction
    unit.ts         — resolveUnit(), isTagUnit(), UNIT_ALIASES (c/w/s/l + tag names)
    visibility.ts   — NON_VISIBLE_ELEMENTS, BLOCK_ELEMENTS, updateNonVisibleDepth()
    search.ts       — buildRegex(), escapeAttr(), buildOpenTag() — shared search/HTML helpers
  api/
    split.ts        — split() with all options (exclude, imageWeight, smartEllipsis, etc.)
    clip.ts         — clip() → string wrapper around split()
    count.ts        — count() + countFromTokens() with line counting
    chunk.ts        — chunk() with overlap and breakAt
    text.ts         — text() extraction with block separator
    split-at.ts     — splitAt() → [string, string]
    slice.ts        — slice() with negative indices
    summary.ts      — summary() → SummaryResult (single-pass statistics)
    pick.ts         — pick() → PickResult[] (extract by text or tag)
    highlight.ts    — highlight() → string (wrap text matches in a tag)
    wrap.ts         — wrap() → wrap by chars, words, or tags
```

Three counting modes:
- **Text-based** (`character/c`, `word/w`, `sentence/s`): counts decoded text, uses grapheme segmenter, skips non-visible elements
- **Line-based** (`line/l`): counts block element openings + `<br>`/`<hr>`
- **Element-based** (any other string like `p`, `li`, `tr`, `img`): counts HTML tag occurrences

Data flow: `html` → `tokenize()` → `Token[]` → counting/splitting with tag stack for balanced output.

## Commands

- **Build**: `npm run build` (tsup → `dist/` with ESM, CJS, `.d.ts`)
- **Test**: `npm test` (vitest — 354 tests across 35 files)
- **Type check**: `npm run typecheck`

## Key Design Decisions

- `split()` uses `keep` (not `count`) as the property name for number of units
- `by` accepts text units (`c/w/s/l`) or any tag name (`p`, `li`, `tr`) — non-text units trigger element-based mode
- Non-visible elements (style, script, head, title, template) preserved in output but not counted
- After truncation, everything is dropped (clean cut) — no preserveTags option
- Library policy: output is always shorter than or equal to input. It's a splitter, not a formatter
- `splitFromTokens()` and `splitCore()` accept a `TruncateOptions` object (not positional args)
- Never tokenize the same HTML twice — reuse `Token[]` across operations
- `output: 'both'` builds plain text in the same pass as HTML (no re-tokenization)
- `preserveWords: true` backtracks to last word boundary (backward compatible), `number` scans forward
- `exclude` uses depth tracking (like nvDepth) to skip excluded elements and their content
- `smartEllipsis` checks next token via `isNextBlockClose()` — only suppresses at clean block boundaries
- Docs live in `docs/` directory, README links use full GitHub URLs (works on npm + GitHub)
