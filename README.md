# html-string-splitter

> Split HTML strings by character, word, sentence, line, or HTML tag — while preserving valid HTML structure.

[![npm version](https://img.shields.io/npm/v/html-string-splitter.svg)](https://www.npmjs.com/package/html-string-splitter)
[![license](https://img.shields.io/npm/l/html-string-splitter.svg)](https://github.com/HrDelwar/html-string-splitter/blob/master/LICENSE)

## Why?

Truncating HTML is hard. If you just use `String.slice()`, you'll break tags, lose closing elements, and produce invalid HTML. This library handles all of that — you just say how much to keep.

```ts
// Without this library (broken HTML)
'<p>Hello <strong>world</strong></p>'.slice(0, 18)
// '<p>Hello <strong>w'  — broken <strong> tag!

// With this library (valid HTML)
clip('<p>Hello <strong>world</strong></p>', { keep: 7, by: 'c' })
// '<p>Hello <strong>w...</strong></p>'  — tags properly closed
```

## Features

- **Split by character, word, sentence, line, or HTML tag**
- **Always valid HTML** — auto-closes open tags, handles nested elements
- **Entity-aware** — `&amp;` counts as 1 character, not 5
- **Emoji support** — `👨‍👩‍👧‍👦` counts as 1 character, not 7
- **10 functions** — `clip`, `split`, `count`, `text`, `splitAt`, `slice`, `chunk`, `summary`, `find`, `wrap`
- **Advanced options** — `exclude`, `imageWeight`, `smartEllipsis`, `selectiveTags`, `wordPattern`, and more
- **Chunk with overlap** — overlapping chunks for RAG/LLM workflows
- **Full TypeScript support** — types included out of the box
- **Dual ESM + CJS** — works in Node.js, browsers, and bundlers
- **Zero dependencies**

---

## Installation

```bash
npm install html-string-splitter
```

---

## Quick Start

```ts
import { clip, split, count, text, summary } from 'html-string-splitter';

// Truncate to 10 characters
clip('<p>Hello <strong>beautiful</strong> world</p>', { keep: 10, by: 'c' });
// '<p>Hello <strong>beau...</strong></p>'

// Split with metadata
split('<p>Hello <strong>beautiful</strong> world</p>', { keep: 10, by: 'c' });
// { html: '<p>Hello <strong>beau...</strong></p>', truncated: true, total: 21, kept: 10 }

// Count words
count('<p>Hello world</p>', { by: 'w' });  // 2

// Extract plain text
text('<p>Hello &amp; world</p>');  // 'Hello & world'

// Full content statistics in one pass
summary('<p>Hello world.</p><p>Second paragraph.</p>');
// { characters: 31, words: 4, sentences: 2, lines: 2, blocks: 2, tags: { p: 2 } }
```

---

## API Overview

| Function | Returns | Description |
|----------|---------|-------------|
| [`clip(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md) | `string` | Truncate HTML, return string |
| [`split(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md) | [`SplitResult`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md#splitresult) | Truncate HTML with metadata |
| [`count(html, options?)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/count.md) | `number` | Count units in HTML |
| [`text(html, options?)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/text.md) | `string` | Extract plain text |
| [`splitAt(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md#splitat) | `[string, string]` | Split into two parts |
| [`slice(html, options?)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md#slice) | `string` | Extract a range |
| [`chunk(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/chunk.md) | `string[]` | Split into equal parts |
| [`summary(html)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/count.md#summary) | [`SummaryResult`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/count.md#summaryresult) | Full statistics in one pass |
| [`find(html, query)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/find.md) | [`FindResult[]`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/find.md#findresult) | Find text positions across tags |
| [`wrap(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/wrap.md) | `string` | Insert wrapper tags at intervals |
| [`tokenize(html)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/tokenize.md) | [`Token[]`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/tokenize.md#token-interface) | Low-level HTML tokenizer |

---

## Split Units

The `by` parameter accepts:

| Unit | Aliases | Description |
|------|---------|-------------|
| `'character'` | `'c'` | Grapheme clusters (emoji-safe) |
| `'word'` | `'w'` | Whitespace-separated words |
| `'sentence'` | `'s'` | Sentence boundaries (`.!?`) |
| `'line'` | `'l'` | Block elements + `<br>` |
| Any tag name | — | e.g. `'p'`, `'li'`, `'tr'`, `'img'` |

---

## [Split Options](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md)

```ts
split(html, {
  keep: 10,                    // units to keep (required)
  by: 'c',                     // split unit
  ellipsis: '...',             // appended at truncation point
  suffix: '<a>Read more</a>',  // HTML after ellipsis
  preserveWords: true,         // avoid mid-word cuts (true | number | 'trim')
  stripTags: true,             // return plain text
  selectiveTags: ['span'],     // only strip these tags (with stripTags)
  stripComments: true,         // remove HTML comments
  smartEllipsis: true,         // skip ellipsis at block boundaries
  imageWeight: 5,              // character cost for media elements
  exclude: ['figcaption'],     // remove these elements entirely
  wordPattern: /[\p{Han}]|\w+/gu, // custom word boundaries (CJK etc.)
  output: 'both',              // 'html' | 'text' | 'both'
  from: 'end',                 // keep from start or end
});
```

See [Options Reference](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md) for detailed documentation.

---

## [Chunk Options](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/chunk.md#options)

```ts
chunk(html, {
  size: 100,           // units per chunk (required)
  by: 'w',             // split unit
  overlap: 20,         // overlapping units between chunks (for RAG)
  breakAt: 'word',     // prefer natural boundaries ('word' | 'sentence' | 'block')
});
```

See [Chunk Documentation](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/chunk.md) for details.

---

## CommonJS

```js
const { clip, split, count } = require('html-string-splitter');
```

## TypeScript

Full type definitions included:

```ts
import type {
  SplitOptions, SplitResult, ChunkOptions, CountOptions,
  SplitUnit, SummaryResult, FindResult, WrapOptions,
  Token, TokenType,
} from 'html-string-splitter';
```

---

## Documentation

- [Split & Clip](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md) — Truncation, splitAt, slice
- [Chunk](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/chunk.md) — Chunking with overlap and breakAt
- [Count & Summary](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/count.md) — Counting and statistics
- [Text Extraction](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/text.md) — Plain text and output modes
- [Find](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/find.md) — Text search across HTML boundaries
- [Wrap](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/wrap.md) — Insert wrapper tags at intervals
- [Tokenize](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/tokenize.md) — Low-level tokenizer API
- [Options Reference](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md) — All options in detail
- [Migration from v1](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/migration.md) — Upgrade guide

---

## License

[ISC](LICENSE) © [HrDelwar](https://github.com/HrDelwar)
