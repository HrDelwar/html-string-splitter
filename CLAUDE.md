# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

npm package (`html-string-splitter` v3.0) that splits/truncates/chunks/streams HTML strings by character, word, sentence, line, byte, custom weight, or element count while preserving valid HTML structure. Zero dependencies. TypeScript with dual ESM + CJS output.

## Architecture

```
src/
  types.ts          — Public interfaces, TokenType (runtime object + type)
  index.ts          — Public exports + deprecated v1 wrapper functions
  document.ts       — parse() → HtmlDocument (DocCore + one method per API function)
  parse/
    tokenizer.ts    — tokenize() + incremental Tokenizer (doctype/CDATA directives, RCDATA, bare '<' as text)
    entities.ts     — decodeEntities, rawOffset (decoded → raw offset), cached Intl.Segmenter, utf8Length, escapeHtml
  engine/
    util.ts         — Pos/cmpPos, firstIndex (the one binary search), isPositive/isNonNegative, toTagSet
    unit.ts         — resolveUnit/isTagUnit, resolveSpec(options) → UnitSpec, specKey (cache key)
    visibility.ts   — element sets, trackDepth/updateNonVisibleDepth/isTagToken
    scan.ts         — Scanner (tokens → atoms via AtomSink), AtomList (atom index + start/end/cut/span), CountSink, BOUNDARY_LEVEL, docAtoms/docCount (cached per document)
    emit.ts         — Emitter (balanced output, filters, marks, breaks, implied end tags, repair mode), render/renderBalanced, SkipCursor, closesBlockNext/atBlockEnd
    doc.ts          — DocCore: tokens + decoded text + AtomList caches (no scanner import, so text-only APIs tree-shake it); toDoc(), HtmlInput
    cut.ts          — resolveOutput (ellipsis/suffix/filter defaults), cutHead/cutTail/headEnd/tailStart/fitOutput
    plain.ts        — PlainText: visible text + offset → Pos map, regex matches as marks
    extractor.ts    — extractText() with block separator
    search.ts       — buildRegex, escapeAttr, buildOpenTag, tagPair
  api/              — one file per public function (split, clip, count, chunk, text, split-at, slice,
                      summary, pick, highlight, wrap, excerpt, snippet, stream, repair)
```

Data flow: `html` → `DocCore` (tokenize once, decode once) → `docAtoms()` runs the `Scanner` to build an `AtomList` for the unit spec → API picks atom indexes → `render()` emits the token range between two `Pos` with balanced tags.

- An **atom** is one unit (grapheme, word, sentence, line, tag match, media element) with start/end `Pos` = (token index, offset into that token's decoded text), a cumulative weight, and a boundary level after it (word / sentence / block, plus a whitespace flag).
- Words and sentences are tracked across inline tags; block elements, `<br>` and `<hr>` always end them. Lines are visual lines.
- Output always slices the raw source (`rawOffset`), never re-joins decoded text — entities and whitespace stay intact.
- Tag units cut right before the next match (`AtomList.tagMode`); text units cut after the last kept atom.

## Commands

- **Build**: `npm run build` (tsup → `dist/` with ESM, CJS, `.d.ts`)
- **Test**: `npm test` (vitest)
- **Type check**: `npm run typecheck`

## Key Design Decisions

- `split()` uses `keep` (not `count`) as the property name for number of units; `keep` is optional when `maxOutputLength` is set
- `by` accepts text units (`c/w/s/l/byte`) or any tag name (`p`, `li`, `tr`) — non-text units trigger element-based mode
- Unit options (`by`, `measure`, `locale`, `wordPattern`, `exclude`, `imageWeight`) resolve through `resolveSpec()` and behave the same in every API, including streaming
- Non-visible elements (style, script, head, title, template) preserved in output but not counted; ranges starting mid-document re-emit hidden elements that precede them (`keepHidden`)
- After truncation, everything is dropped (clean cut) — no preserveTags option
- Library policy: output is always shorter than or equal to input. It's a splitter, not a formatter
- `"sideEffects": false`: keep modules free of top-level side effects other than constant tables, and keep `DocCore` from importing the scanner, so consumers only bundle what they import
- Never tokenize the same HTML twice — every API accepts `HtmlInput` (string or parsed document) and works off `DocCore`
- Shared logic lives in one place: binary search (`firstIndex`), depth tracking (`trackDepth`), positions (`AtomList.start/end/cut/span`), rendering (`render`/`renderBalanced`), output defaults (`resolveOutput`)
- `preserveWords: true` backtracks to last word boundary, `number` scans forward
- `smartEllipsis` suppresses the ellipsis only at clean block ends (`closesBlockNext`); `excerpt()` defaults it on
- Streaming (`createSplitter`) holds tokens until the scanner confirms the unit fits, so output equals `clip()` for any chunk boundaries
- Docs live in `docs/` directory, README links use full GitHub URLs (works on npm + GitHub)
