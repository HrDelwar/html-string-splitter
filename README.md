# html-string-splitter

> Split HTML strings by character, word, sentence, line, or HTML tag — while preserving valid HTML structure.

[![npm version](https://img.shields.io/npm/v/html-string-splitter.svg)](https://www.npmjs.com/package/html-string-splitter)
[![license](https://img.shields.io/npm/l/html-string-splitter.svg)](https://github.com/HrDelwar/html-string-splitter/blob/master/LICENSE)

## Why?

Truncating HTML is hard. `String.slice()` breaks tags and produces invalid HTML. This library handles all of that:

```ts
// Broken HTML
'<p>Hello <strong>world</strong></p>'.slice(0, 18)
// '<p>Hello <strong>w'  — broken tag!

// Valid HTML
clip('<p>Hello <strong>world</strong></p>', { keep: 7, by: 'c' })
// '<p>Hello <strong>w...</strong></p>'  — properly closed
```

**Zero dependencies. TypeScript. ESM + CJS. Emoji-safe. Entity-aware.**

## Installation

```bash
npm install html-string-splitter
```

---

## Common Use Cases

### Blog post preview
```ts
import { clip } from 'html-string-splitter';

clip(articleHtml, { keep: 200, by: 'c' });
// First 200 characters with "..." and valid HTML

clip(articleHtml, { keep: 200, by: 'c', suffix: '<a href="/post">Read more</a>' });
// With a "Read More" link
```

### Word-based truncation
```ts
clip('<p>Hello beautiful world</p>', { keep: 2, by: 'w' });
// '<p>Hello beautiful...</p>'
```

### Conditional "Read More"
```ts
import { split } from 'html-string-splitter';

const result = split(html, { keep: 200, by: 'c' });
if (result.truncated) {
  showReadMoreButton();
}
// result = { html, truncated, total, kept }
```

### Count words or characters
```ts
import { count } from 'html-string-splitter';

count('<p>Hello world</p>', { by: 'w' });  // 2
count('<p>A &amp; B</p>');                 // 5 (entity = 1 char)
```

### Extract plain text
```ts
import { text } from 'html-string-splitter';

text('<p>Hello <strong>world</strong></p>');  // 'Hello world'
```

### Paginate an article
```ts
import { chunk } from 'html-string-splitter';

const pages = chunk(articleHtml, { size: 100, by: 'w' });
// pages[0] = first 100 words (valid HTML)
// pages[1] = next 100 words (valid HTML)
```

### Split by HTML tag
```ts
// Keep first 3 paragraphs
clip(html, { keep: 3, by: 'p' });

// Keep first 5 list items
clip(html, { keep: 5, by: 'li' });

// Count all images
count(html, { by: 'img' });
```

---

## Core API

| Function | Returns | Description |
|----------|---------|-------------|
| [`clip(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md) | `string` | Truncate HTML, return string |
| [`split(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md) | [`SplitResult`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md#splitresult) | Truncate with metadata |
| [`count(html, options?)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/count.md) | `number` | Count units |
| [`text(html, options?)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/text.md) | `string` | Extract plain text |
| [`splitAt(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md#splitat) | `[string, string]` | Split into two parts |
| [`slice(html, options?)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md#slice) | `string` | Extract a range (like `String.slice`) |
| [`chunk(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/chunk.md) | `string[]` | Split into equal parts |

### Advanced API

| Function | Returns | Description |
|----------|---------|-------------|
| [`summary(html)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/count.md#summary) | [`SummaryResult`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/count.md#summaryresult) | Full statistics in one pass |
| [`pick(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/pick.md) | [`PickResult[]`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/pick.md#pickresult) | Extract pieces by text or tag |
| [`highlight(html, query)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/pick.md#highlight) | `string` | Wrap text matches in a tag |
| [`wrap(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/wrap.md) | `string` | Insert wrapper tags at intervals |
| [`tokenize(html)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/tokenize.md) | [`Token[]`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/tokenize.md#token-interface) | Low-level HTML tokenizer |

---

## Split Units

The `by` parameter accepts:

| Unit | Alias | Example |
|------|-------|---------|
| `'character'` | `'c'` | `clip(html, { keep: 100, by: 'c' })` |
| `'word'` | `'w'` | `clip(html, { keep: 20, by: 'w' })` |
| `'sentence'` | `'s'` | `clip(html, { keep: 3, by: 's' })` |
| `'line'` | `'l'` | `clip(html, { keep: 5, by: 'l' })` |
| Any tag name | — | `clip(html, { keep: 3, by: 'p' })` |

---

## Options

### Basic

```ts
clip(html, {
  keep: 10,            // units to keep (required)
  by: 'c',             // split unit (default: 'c')
  ellipsis: '...',     // appended at truncation (default: '...')
  suffix: '<a>More</a>', // HTML after ellipsis
  from: 'end',         // 'start' (default) or 'end'
  stripTags: true,     // return plain text
});
```

### Advanced

```ts
split(html, {
  keep: 100,
  by: 'c',
  preserveWords: true,         // don't cut mid-word (true | number | 'trim')
  smartEllipsis: true,         // skip "..." at block boundaries
  stripComments: true,         // remove HTML comments
  exclude: ['figcaption'],     // remove elements entirely
  selectiveTags: ['span'],     // only strip these tags (with stripTags)
  imageWeight: 5,              // character cost for <img>, <video>, etc.
  wordPattern: /[\p{Han}]|\w+/gu, // custom word boundaries (CJK)
  output: 'both',              // return html + text in one pass
});
```

### Chunk

```ts
chunk(html, {
  size: 100,           // units per chunk (required)
  by: 'w',             // split unit
  overlap: 20,         // shared units between chunks (for RAG/LLM)
  breakAt: 'word',     // don't cut mid-word
});
```

See [Options Reference](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md) for detailed explanations with examples.

---

## CommonJS

```js
const { clip, split, count } = require('html-string-splitter');
```

## TypeScript

```ts
import type { SplitOptions, SplitResult, ChunkOptions, PickOptions, HighlightOptions } from 'html-string-splitter';
```

---

## Documentation

**Guides:**
- [Split & Clip](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md) — Truncation, splitAt, slice
- [Chunk](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/chunk.md) — Pagination with overlap and breakAt
- [Count & Summary](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/count.md) — Counting and statistics
- [Text Extraction](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/text.md) — Plain text and output modes

**Advanced:**
- [Pick & Highlight](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/pick.md) — Extract pieces and highlight matches
- [Wrap](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/wrap.md) — Insert wrapper tags at intervals
- [Tokenize](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/tokenize.md) — Low-level tokenizer API

**Reference:**
- [Options Reference](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md) — All options in detail
- [Migration from v1](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/migration.md) — Upgrade guide

---

## License

[MIT](LICENSE) © [HrDelwar](https://github.com/HrDelwar)
