# Chunk

## `chunk(html, options)` → `string[]` | `ChunkResult[]`

Split HTML into multiple equal-sized parts. Each chunk is valid HTML with properly closed tags. Built for pagination and for RAG/LLM pipelines: chunks can end on block or sentence boundaries, carry their heading trail, and be sized by a token counter.

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

// Split by line
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
| `breakAt` | `'word' \| 'sentence' \| 'block'` | — | Preferred place to end a chunk |
| `meta` | `boolean` | `false` | Return `ChunkResult` objects instead of strings |
| `measure` | `(text) => number` | — | Size chunks by a custom weight, e.g. LLM tokens |
| `exclude` | `string[]` | — | Elements to drop and not count |
| `stripComments` | `boolean` | `false` | Remove HTML comments |

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

Use `breakAt` to avoid cutting mid-word:

```ts
// Without breakAt — may cut mid-word
chunk('<p>Hello beautiful world today</p>', { size: 8, by: 'c' });
// [
//   '<p>Hello be</p>',     ← "beautiful" cut at "be"
//   '<p>autiful </p>',
//   ...
// ]

// With breakAt: 'word' — each chunk ends after a whole word
chunk('<p>Hello beautiful world today</p>', { size: 10, by: 'c', breakAt: 'word' });
// [
//   '<p>Hello </p>',
//   '<p>beautiful </p>',
//   '<p>world </p>',
//   '<p>today</p>'
// ]
```

In character mode, whitespace stays with the chunk before it, so the chunks together contain all of the text.

### `breakAt: 'sentence'` and `'block'`

`'block'` ends chunks at the end of a paragraph, list item, heading section and so on. `'sentence'` ends them after a full sentence. If a single block or sentence is larger than `size`, the chunk falls back to the next level down (block → sentence → word → hard cut).

```ts
const doc = '<h1>Setup</h1><p>Install the package. Then import it.</p>' +
  '<h2>Usage</h2><p>Call clip() with a limit. It returns valid HTML.</p>';

chunk(doc, { size: 8, by: 'w', breakAt: 'block' });
// [
//   '<h1>Setup</h1><p>Install the package. Then import it.</p>',
//   '<h2>Usage</h2><p>Call clip() with a limit.</p>',   ← block too big, ended at a sentence
//   '<p>It returns valid HTML.</p>'
// ]

chunk('<p>One two three. Four five six seven. Eight nine.</p>', { size: 5, by: 'w', breakAt: 'sentence' });
// ['<p>One two three.</p>', '<p>Four five six seven.</p>', '<p>Eight nine.</p>']
```

- A chunk never ends right after a heading; the heading starts the next chunk.
- `<table>` and `<pre>` are kept whole when they fit.
- With `overlap`, the overlap is moved to start at a sentence (or block) boundary.

## Chunk Metadata

`meta: true` returns objects instead of strings:

```ts
chunk(doc, { size: 8, by: 'w', breakAt: 'block', meta: true });
// [
//   {
//     html: '<h1>Setup</h1><p>Install the package. Then import it.</p>',
//     text: 'Setup\nInstall the package. Then import it.',
//     index: 0, start: 0, end: 7,
//     headings: ['Setup']
//   },
//   {
//     html: '<h2>Usage</h2><p>Call clip() with a limit.</p>',
//     text: 'Usage\nCall clip() with a limit.',
//     index: 1, start: 7, end: 13,
//     headings: ['Setup', 'Usage']
//   },
//   ...
// ]
```

```ts
interface ChunkResult {
  html: string;        // Valid HTML for the chunk
  text: string;        // Plain text, blocks separated by '\n'
  index: number;       // Position in the result
  start: number;       // First unit (offset in units into the document)
  end: number;         // One past the last unit
  headings: string[];  // Heading trail in effect at the chunk start (h1 → h6)
}
```

`headings` is the context to store next to each embedding. A chunk from the middle of "Usage" still knows it belongs to "Setup › Usage".

## Token-Sized Chunks

Pass a `measure` function to size chunks by anything, for example your model's tokenizer:

```ts
import { encode } from 'gpt-tokenizer';

chunk(html, {
  size: 512,
  measure: text => encode(text).length,
  breakAt: 'block',
  overlap: 64,
  meta: true,
});
```

`measure` is applied per word, so totals are a close approximation of the real token count of the full text.
