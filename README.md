# html-string-splitter

> Split, truncate, chunk and stream HTML by character, word, sentence, line, byte, token or tag — while preserving valid HTML structure.

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

**Zero dependencies. TypeScript. ESM + CJS. Emoji-safe. Entity-aware. Streaming.**

Counts text the way a browser renders it: `un<b>believ</b>able` is one word, a sentence can span tags, and escaped text stays escaped.

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

### Fit an LLM token budget or a DB column
```ts
clip(html, { keep: 512, measure: text => encode(text).length });  // tokens
clip(html, { keep: 160, by: 'byte' });                            // UTF-8 bytes
clip(html, { maxOutputLength: 2000 });                            // final string, markup included
```

### Chunk for RAG
```ts
chunk(html, { size: 300, by: 'w', breakAt: 'block', overlap: 30, meta: true });
// [{ html, text, index, start, end, headings: ['Guide', 'Install'], anchor: 'install' }, ...]
```

### Natural excerpts and search snippets
```ts
import { excerpt, snippet } from 'html-string-splitter';

excerpt(html, { min: 120, max: 200 });     // ends at a paragraph or sentence when possible
snippet(html, 'install', { radius: 8 });   // 8 words each side, match in <mark>
```

### Stream an LLM response
```ts
import { splitStream } from 'html-string-splitter';

response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(splitStream({ keep: 200, by: 'w' }));  // stops upstream at the limit
```

### Parse once, run many operations
```ts
import { parse } from 'html-string-splitter';

const doc = parse(html);
doc.count({ by: 'w' });
doc.clip({ keep: 50, by: 'w' });
doc.summary().readingTime;
```

### Table of contents and sections
```ts
import { outline, section } from 'html-string-splitter';

outline(html);              // [{ level: 2, text: 'Install', id: 'install', slug: 'install', words: 340, children: [...] }]
section(html, 'install');   // balanced HTML of that section only
```

### Apply NLP / LLM results to HTML
```ts
import { annotate, text } from 'html-string-splitter';

const entities = findEntities(text(html));  // [{ start, end, className: 'person' }, ...]
annotate(html, entities);                   // ranges wrapped in <mark>, HTML kept valid
```

### Fix broken or partial HTML
```ts
import { repair } from 'html-string-splitter';

repair('<p>Hello <b>world</p><div>');  // '<p>Hello <b>world</b></p><div></div>'
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
| [`chunk(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/chunk.md) | `string[]` \| [`ChunkResult[]`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/chunk.md#chunk-metadata) | Split into parts, by size and structure |
| [`excerpt(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/excerpt.md) | [`SplitResult`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md#splitresult) | Truncate within a range at a natural boundary |
| [`snippet(html, query)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/excerpt.md#snippet) | `string` | Search-result excerpt around matches |

### Advanced API

| Function | Returns | Description |
|----------|---------|-------------|
| [`outline(html)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/outline.md) | [`OutlineItem[]`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/outline.md#outlineitem) | Heading tree with ids, slugs and word counts |
| [`section(html, target)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/outline.md#sectionhtml-target-options--string) | `string` | One section's HTML by id, slug, text or index |
| [`summary(html)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/count.md#summary) | [`SummaryResult`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/count.md#summaryresult) | Full statistics in one pass |
| [`pick(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/pick.md) | [`PickResult[]`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/pick.md#pickresult) | Extract pieces by text or tag |
| [`highlight(html, query)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/pick.md#highlight) | `string` | Wrap text matches in a tag |
| [`annotate(html, ranges)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/pick.md#annotatehtml-annotations-options--string) | `string` | Wrap plain-text offset ranges in markup |
| [`wrap(html, options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/wrap.md) | `string` | Wrap content at intervals (by chars, words, or tags) |
| [`repair(html)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/repair.md) | `string` | Balance broken or partial HTML |
| [`parse(html)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/parse.md) | `HtmlDocument` | Parse once, call any method without re-tokenizing |
| [`createSplitter(options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/stream.md) | `StreamSplitter` | Truncate HTML incrementally |
| [`splitStream(options)`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/stream.md#splitstreamoptions--transformstreamstring-string) | `TransformStream` | Web Streams truncation |
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
| `'byte'` | — | `clip(html, { keep: 160, by: 'byte' })` |
| Any tag name | — | `clip(html, { keep: 3, by: 'p' })` |

Any unit can be weighted with `measure`, and `locale` enables dictionary word splitting for Chinese, Japanese, Thai and similar languages.

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
  locale: 'ja',                // Intl.Segmenter word splitting
  measure: countTokens,        // weight per unit (e.g. LLM tokens)
  maxOutputLength: 500,        // cap the final string, markup included
  output: 'both',              // return html + text in one pass
});
```

### Chunk

```ts
chunk(html, {
  size: 100,           // units per chunk (required)
  by: 'w',             // split unit
  overlap: 20,         // shared units between chunks (for RAG/LLM)
  breakAt: 'block',    // end at 'block' | 'sentence' | 'word' boundaries
  meta: true,          // return { html, text, start, end, headings }
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
import type { SplitOptions, SplitResult, ChunkOptions, ChunkResult, HtmlInput, StreamOptions } from 'html-string-splitter';
```

---

## Documentation

**Guides:**
- [Split & Clip](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md) — Truncation, splitAt, slice
- [Chunk](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/chunk.md) — Pagination and RAG chunking with overlap, boundaries and metadata
- [Excerpt & Snippet](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/excerpt.md) — Natural-boundary excerpts and search snippets
- [Streaming](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/stream.md) — Truncate HTML as it arrives
- [Outline & Section](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/outline.md) — Heading tree and section extraction
- [Count & Summary](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/count.md) — Counting and statistics
- [Text Extraction](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/text.md) — Plain text and output modes

**Advanced:**
- [Pick, Highlight & Annotate](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/pick.md) — Extract pieces, highlight matches, apply text ranges
- [Wrap](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/wrap.md) — Wrap by chars, words, or tags
- [Repair](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/repair.md) — Balance broken or streamed HTML
- [Parsed Documents](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/parse.md) — Parse once, reuse everywhere
- [Tokenize](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/tokenize.md) — Low-level and incremental tokenizer API

**Reference:**
- [Options Reference](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md) — All options in detail
- [Migration](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/migration.md) — Upgrading from v2 or v1

---

## License

[MIT](LICENSE) © [HrDelwar](https://github.com/HrDelwar)
