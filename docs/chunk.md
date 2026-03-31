# Chunk

## `chunk(html, options)` → `string[]`

Split HTML into multiple equal-sized parts. Each chunk is valid HTML with properly closed tags.

```ts
import { chunk } from 'html-string-splitter';

// Split by words
const pages = chunk('<p>one two three four five six</p>', { size: 2, by: 'w' });
// [
//   '<p>one two</p>',
//   '<p>three four</p>',
//   '<p>five six</p>'
// ]

// Split by characters
const parts = chunk('<p>Hello World</p>', { size: 5, by: 'c' });
// [
//   '<p>Hello</p>',
//   '<p> Worl</p>',
//   '<p>d</p>'
// ]

// Split by HTML tag — group list items
const groups = chunk(
  '<ul><li>A</li><li>B</li><li>C</li><li>D</li></ul>',
  { size: 2, by: 'li' }
);
// [
//   '<ul><li>A</li><li>B</li></ul>',
//   '<ul><li>C</li><li>D</li></ul>'
// ]

// Split by line (block elements)
const sections = chunk(
  '<p>First</p><p>Second</p><p>Third</p><p>Fourth</p>',
  { size: 2, by: 'line' }
);
// [
//   '<p>First</p><p>Second</p>',
//   '<p>Third</p><p>Fourth</p>'
// ]

// Content shorter than size — returns as single chunk
chunk('<p>Short</p>', { size: 100, by: 'c' });
// ['<p>Short</p>']
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `size` | `number` | — | **(required)** Units per chunk |
| `by` | [`SplitUnit`](https://github.com/HrDelwar/html-string-splitter#split-units) | `'c'` | What to count |
| `overlap` | `number` | `0` | Overlapping units between chunks |
| `breakAt` | `'word' \| 'sentence' \| 'block'` | — | Prefer natural boundaries |

See [Options Reference](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md) for detailed explanations of each option.

## Overlapping Chunks

Use `overlap` for RAG/LLM indexing workflows where context needs to be shared between chunks:

```ts
// Without overlap — content is strictly partitioned
chunk('<p>one two three four five six</p>', { size: 3, by: 'w' });
// [
//   '<p>one two three</p>',
//   '<p>four five six</p>'
// ]

// With overlap — last 2 words of each chunk appear as first 2 of the next
chunk('<p>one two three four five six</p>', { size: 3, by: 'w', overlap: 2 });
// [
//   '<p>one two three</p>',
//   '<p>two three four</p>',
//   '<p>three four five</p>',
//   '<p>four five six</p>'
// ]

// Character overlap for search indexing
chunk('<p>Hello World Test</p>', { size: 8, by: 'c', overlap: 3 });
// Overlapping characters ensure no search term is split at a boundary
```

`overlap` must be less than `size` — throws an error otherwise:

```ts
chunk(html, { size: 10, by: 'w', overlap: 10 });
// Error: overlap must be less than size
```

## Break at Natural Boundaries

Use `breakAt` to avoid cutting mid-word or mid-sentence:

```ts
// Without breakAt — may cut mid-word
chunk('<p>Hello beautiful world today</p>', { size: 8, by: 'c' });
// [
//   '<p>Hello be</p>',     ← "beautiful" cut at "be"
//   '<p>autiful </p>',
//   ...
// ]

// With breakAt: 'word' — trims incomplete last word
chunk('<p>Hello beautiful world today</p>', { size: 8, by: 'c', breakAt: 'word' });
// [
//   '<p>Hello</p>',        ← clean word boundary
//   '<p>beautiful</p>',
//   ...
// ]
```

| Value | Behavior |
|-------|----------|
| `'word'` | Trims incomplete last word (uses `preserveWords: 'trim'` internally) |
| `'sentence'` | Extends to next sentence end or trims to last complete sentence |
| `'block'` | Extends to include complete block element |
