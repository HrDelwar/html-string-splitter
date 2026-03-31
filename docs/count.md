# Count & Summary

## `count(html, options?)` → `number`

Count characters, words, sentences, lines, or HTML tags. Only counts visible text — ignores `<style>`, `<script>`, `<head>`, and `<title>` content.

```ts
import { count } from 'html-string-splitter';

// Characters (default)
count('<p>Hello world</p>');               // 11
count('<p>A &amp; B</p>');                 // 5  (entity → 1 char)
count('<p>Hello 😀</p>');                  // 7  (emoji → 1 char)
count('<p>👨‍👩‍👧‍👦 family</p>');                 // 8  (combined emoji → 1 char)

// Words
count('<p>Hello world</p>', { by: 'w' });  // 2
count('<p>Hello <strong>beautiful</strong> world</p>', { by: 'w' });  // 3

// Sentences
count('<p>First sentence. Second one!</p>', { by: 's' });  // 2
count('<p>Mr. Smith went home. He was tired.</p>', { by: 's' });  // 2 (handles abbreviations)

// Lines (block elements + <br>)
count('<p>Line 1</p><p>Line 2</p>', { by: 'line' });  // 2
count('Line 1<br>Line 2<br>Line 3', { by: 'l' });      // 2 (<br> counted)
count('<div><p>Nested</p></div>', { by: 'line' });       // 2 (div + p)

// HTML tags
count('<ul><li>A</li><li>B</li><li>C</li></ul>', { by: 'li' });  // 3
count('<p>Text <img src="a.png"> more <img src="b.png"></p>', { by: 'img' });  // 2

// Non-visible content is ignored
count('<style>.red{color:red}</style><p>Hello</p>');  // 5 (only "Hello")
count('<script>alert(1)</script><p>World</p>');        // 5 (only "World")

// Custom word pattern (CJK)
count('<p>你好世界</p>', { by: 'w' });  // 1 (no spaces = 1 word by default)
count('<p>你好世界</p>', { by: 'w', wordPattern: /[\p{Script=Han}]/gu });  // 4 (each char = 1 word)
```

### Options

| Option | Type | Default |
|--------|------|---------|
| `by` | [`SplitUnit`](https://github.com/HrDelwar/html-string-splitter#split-units) | `'c'` |
| [`wordPattern`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#wordpattern) | `RegExp` | — |

---

## `summary(html)` → `SummaryResult` {#summary}

Get full content statistics in a single pass — characters, words, sentences, lines, blocks, and tag counts. More efficient than calling `count()` multiple times.

```ts
import { summary } from 'html-string-splitter';

// Simple paragraph
summary('<p>Hello world.</p>');
// {
//   characters: 12,
//   words: 2,
//   sentences: 1,
//   lines: 1,
//   blocks: 1,
//   tags: { p: 1 }
// }

// Rich content
summary('<h1>Title</h1><p>First sentence. Second sentence.</p><p>Third.</p>');
// {
//   characters: 40,
//   words: 6,
//   sentences: 3,
//   lines: 3,       (h1 + 2x p)
//   blocks: 3,
//   tags: { h1: 1, p: 2 }
// }

// Mixed content with media
summary('<p>Text <img src="photo.jpg"> more <br> end</p>');
// {
//   characters: 14,
//   words: 3,
//   sentences: 1,
//   lines: 2,       (p + br)
//   blocks: 1,       (only p, br is not a block)
//   tags: { p: 1, img: 1, br: 1 }
// }

// Non-visible elements — text excluded, tags still counted
summary('<style>.x{color:red}</style><p>Visible text.</p>');
// {
//   characters: 13,    (only "Visible text.")
//   words: 2,
//   sentences: 1,
//   lines: 1,
//   blocks: 1,
//   tags: { style: 1, p: 1 }  (style tag counted, its text not)
// }

// Empty input
summary('');
// { characters: 0, words: 0, sentences: 0, lines: 0, blocks: 0, tags: {} }

// Plain text (no HTML)
summary('Just plain text here.');
// { characters: 21, words: 4, sentences: 1, lines: 0, blocks: 0, tags: {} }
```

### SummaryResult

```ts
interface SummaryResult {
  characters: number;              // Grapheme count (visible text only)
  words: number;                   // Word count (visible text only)
  sentences: number;               // Sentence count (visible text only)
  lines: number;                   // Block elements + <br>/<hr>
  blocks: number;                  // Block elements only
  tags: Record<string, number>;    // All tag occurrence counts
}
```
