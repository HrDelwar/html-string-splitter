# html-string-splitter

> Split HTML strings by character, word, sentence, or HTML tag — while preserving valid HTML structure.

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

- **Split by character, word, sentence, or HTML tag**
- **Always valid HTML** — auto-closes open tags, handles nested elements
- **Entity-aware** — `&amp;` counts as 1 character, not 5
- **Emoji support** — `👨‍👩‍👧‍👦` counts as 1 character, not 7
- **Split by HTML tags** — truncate by `<p>`, `<li>`, `<tr>`, `<img>`, or any tag
- **Split from either end** — keep first N or last N units
- **7 functions** — `clip`, `split`, `count`, `text`, `splitAt`, `slice`, `chunk`
- **Works with plain text** — HTML tags are not required
- **Skips non-visible content** — `<style>`, `<script>`, `<head>` not counted
- **Full TypeScript support** — types included out of the box
- **Dual ESM + CJS** — works in Node.js, browsers, and bundlers
- **Zero dependencies** — 3.8KB gzipped

---

## Installation

```bash
npm install html-string-splitter
# or
yarn add html-string-splitter
# or
pnpm add html-string-splitter
# or
bun add html-string-splitter
```

---

## Quick Start

```ts
import { clip, split, count, text } from 'html-string-splitter';

// Truncate to 10 characters — returns HTML string
clip('<p>Hello <strong>beautiful</strong> world</p>', { keep: 10, by: 'c' });
// '<p>Hello <strong>beau...</strong></p>'

// Same thing but with metadata — returns object
split('<p>Hello <strong>beautiful</strong> world</p>', { keep: 10, by: 'c' });
// { html: '<p>Hello <strong>beau...</strong></p>', truncated: true, total: 21, kept: 10 }

// Count words in HTML (ignores tags, only counts visible text)
count('<p>Hello world</p>', { by: 'w' });
// 2

// Extract plain text (strips tags, decodes entities)
text('<p>Hello &amp; world</p>');
// 'Hello & world'
```

---

## API

### `clip(html, options)` → `string`

The simplest way to truncate HTML. Returns the truncated HTML string directly.

```ts
// By character
clip('<p>Hello world</p>', { keep: 5, by: 'c' })
// '<p>Hello...</p>'

// By word
clip('<p>Hello beautiful world</p>', { keep: 2, by: 'w' })
// '<p>Hello beautiful...</p>'

// By HTML tag — keep first 2 list items
clip('<ul><li>A</li><li>B</li><li>C</li></ul>', { keep: 2, by: 'li' })
// '<ul><li>A</li><li>B</li></ul>'

// From the end — keep last 5 words
clip(html, { keep: 5, by: 'w', from: 'end' })
// '...last five words of content</p>'

// With a "Read More" button
clip(html, { keep: 200, by: 'c', suffix: '<a href="/post">Read more</a>' })
```

Takes the same options as `split()`.

---

### `split(html, options)` → `SplitResult`

Like `clip()` but returns an object with metadata. Use this when you need to know if the content was actually truncated, or how many units were in the original.

```ts
const result = split('<p>Hello beautiful world</p>', { keep: 2, by: 'w' });
// result.html      → '<p>Hello beautiful...</p>'
// result.truncated → true
// result.total     → 3  (total words in original)
// result.kept      → 2  (words kept in output)

// Useful for conditional "Read More" buttons
const result = split(html, { keep: 200, by: 'c' });
if (result.truncated) {
  showReadMoreButton();
}
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `keep` | `number` | — | **(required)** How many units to keep |
| `by` | `string` | `'c'` | What to count: `'c'` (characters), `'w'` (words), `'s'` (sentences), or any HTML tag name like `'p'`, `'li'`, `'tr'` |
| `ellipsis` | `string` | `'...'` for text, `''` for HTML tags | Appended at the truncation point |
| `suffix` | `string` | `''` | HTML added after the ellipsis (e.g. a "Read More" link) |
| `preserveWords` | `boolean` | `false` | Avoid cutting in the middle of a word (only works with character mode) |
| `stripTags` | `boolean` | `false` | Return plain text instead of HTML |
| `from` | `'start'` or `'end'` | `'start'` | Keep from the beginning or the end |

---

### `count(html, options?)` → `number`

Count characters, words, sentences, or HTML tags in your content. Only counts visible text — ignores `<style>`, `<script>`, `<head>`, and `<title>` content.

```ts
count('<p>Hello world</p>')               // 11 (characters, default)
count('<p>Hello world</p>', { by: 'w' })  // 2  (words)
count('<p>First. Second.</p>', { by: 's' }) // 2  (sentences)
count('<p>A &amp; B</p>')                 // 5  (entities count as 1)
count('<p>Hello 😀</p>')                  // 7  (emoji = 1 character)

// Count HTML tags
count('<ul><li>A</li><li>B</li><li>C</li></ul>', { by: 'li' })  // 3
count(html, { by: 'img' })   // count all images
count(html, { by: 'p' })     // count all paragraphs
```

---

### `text(html, options?)` → `string`

Extract plain text from HTML. Strips all tags, decodes entities (`&amp;` → `&`), and skips non-visible content like `<style>` and `<script>`.

```ts
text('<p>Hello <strong>world</strong></p>')
// 'Hello world'

text('<p>Price: &dollar;19.99</p>')
// 'Price: $19.99'
```

By default, text from block-level tags (like `<p>`, `<div>`, `<li>`) runs together. Use `separator` to add spacing:

```ts
text('<h1>Title</h1><p>Body text</p>')
// 'TitleBody text'

text('<h1>Title</h1><p>Body text</p>', { separator: ' ' })
// 'Title Body text'

text('<ul><li>Apple</li><li>Banana</li></ul>', { separator: '\n' })
// 'Apple\nBanana'
```

---

### `splitAt(html, options)` → `[string, string]`

Split HTML into two parts at a specific position. Both parts are valid HTML with properly closed tags.

```ts
// Split at 5th character
const [before, after] = splitAt('<p>Hello world</p>', { at: 5, by: 'c' });
// before: '<p>Hello</p>'
// after:  '<p> world</p>'

// Split at the 2nd list item
const [first, rest] = splitAt(listHtml, { at: 2, by: 'li' });

// Split article at the first <h2> heading
const [intro, body] = splitAt(article, { at: 1, by: 'h2' });
```

---

### `slice(html, options?)` → `string`

Extract a range from HTML, like `String.slice()`. Supports negative indices.

```ts
// Characters 6-11
slice('<p>Hello world</p>', { start: 6, end: 11, by: 'c' })

// Last 5 characters
slice(html, { start: -5, by: 'c' })

// 2nd and 3rd list items
slice(listHtml, { start: 1, end: 3, by: 'li' })

// Paragraphs 3-5
slice(article, { start: 2, end: 5, by: 'p' })
```

---

### `chunk(html, options)` → `string[]`

Split HTML into multiple equal-sized parts. Useful for pagination.

```ts
// Split into pages of 100 words each
const pages = chunk(article, { size: 100, by: 'w' });
// pages[0] = first 100 words (valid HTML)
// pages[1] = next 100 words (valid HTML)
// ...

// Group table rows (e.g. for lazy loading)
const groups = chunk(tableHtml, { size: 25, by: 'tr' });
```

---

## Splitting by HTML Tag

Any string that isn't `'c'`, `'w'`, or `'s'` is treated as an HTML tag name. This lets you split, count, or slice by any HTML tag:

```ts
// Paragraphs
clip(article, { keep: 3, by: 'p' })         // first 3 paragraphs
count(article, { by: 'p' })                  // total paragraph count

// List items
clip(list, { keep: 5, by: 'li' })           // first 5 items

// Table rows
chunk(table, { size: 10, by: 'tr' })        // groups of 10 rows

// Images
count(gallery, { by: 'img' })               // total image count
clip(gallery, { keep: 4, by: 'img' })       // first 4 images

// Headings
splitAt(article, { at: 1, by: 'h2' })       // split at first <h2>

// Any tag works — including custom elements
count(html, { by: 'my-component' })
```

When splitting by HTML tag, ellipsis defaults to `''` (empty) instead of `'...'`, since you're removing whole tags, not cutting text.

---

## How Counting Works

The library only counts **visible text**. Tags, attributes, and non-visible content are ignored:

```ts
const html = '<style>.x{color:red}</style><p class="big">Hello &amp; world</p>';

count(html)              // 13 — only "Hello & world"
count(html, { by: 'w' }) // 3  — "Hello", "&", "world"
```

| What | Counted? |
|------|----------|
| Text inside tags | Yes |
| HTML entities (`&amp;` `&copy;` `&#169;`) | Yes, as 1 character each |
| Emoji (`😀` `👨‍👩‍👧‍👦` `🇺🇸`) | Yes, as 1 character each |
| Tag names and attributes | No |
| CSS inside `<style>` | No |
| JavaScript inside `<script>` | No |
| Content inside `<head>`, `<title>`, `<template>` | No |

---

## Plain Text

Works with plain text too — HTML tags are not required:

```ts
clip('Hello world this is plain text', { keep: 5, by: 'w' })
// 'Hello world this is plain...'

count('Just plain text')        // 15
text('Already plain text')      // 'Already plain text'
```

---

## CommonJS

```js
const { clip, split, count, text } = require('html-string-splitter');

const preview = clip(html, { keep: 100, by: 'c' });
```

---

## TypeScript

Full type definitions included. Import types for your own code:

```ts
import { split } from 'html-string-splitter';
import type { SplitOptions, SplitResult } from 'html-string-splitter';

function preview(html: string, opts: SplitOptions): string {
  return split(html, opts).html;
}
```

**Available types:**

| Type | Used by |
|------|---------|
| `SplitOptions` | `split()`, `clip()` |
| `SplitResult` | Return type of `split()` — `{ html, truncated, total, kept }` |
| `CountOptions` | `count()` |
| `ChunkOptions` | `chunk()` |
| `TextOptions` | `text()` |
| `SplitAtOptions` | `splitAt()` |
| `SliceOptions` | `slice()` |
| `SplitUnit` | The `by` parameter — `'c'`, `'w'`, `'s'`, or any tag name |

---

## Migration from v1

| v1 | v2 |
|----|-----|
| `splitByCharacterCount(html, 15)` | `clip(html, { keep: 15 })` |
| `splitByCharacterCount(html, 15, btn)` | `clip(html, { keep: 15, suffix: btn })` |
| `splitByWordCount(html, 6)` | `clip(html, { keep: 6, by: 'w' })` |
| `getCharacterCount(html)` | `count(html)` |
| `getWordCount(html)` | `count(html, { by: 'w' })` |

v1 functions still work but are deprecated.

**What changed in v2:**

- Always produces valid, balanced HTML (v1 could produce broken tags)
- Counts entities correctly — `&amp;` = 1 character, not 5
- Handles text before tags — `"Hello <p>world</p>"` no longer drops `"Hello"`
- Supports emoji — `😀` = 1 character, not 2
- Returns `''` instead of `null` for invalid inputs
- `split()` returns a `SplitResult` object with metadata instead of just a string
- Use `clip()` for the old behavior of getting just a string back

---

## License

[ISC](LICENSE) © [HrDelwar](https://github.com/HrDelwar)
