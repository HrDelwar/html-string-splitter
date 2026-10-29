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
count('<p>un<b>believ</b>able</p>', { by: 'w' });  // 1 (renders as one word)

// Sentences
count('<p>First sentence. Second one!</p>', { by: 's' });  // 2
count('<p>Mr. Smith went home. He was tired.</p>', { by: 's' });  // 2 (handles abbreviations)

// Lines (visual lines: content separated by blocks, <br> or <hr>)
count('<p>Line 1</p><p>Line 2</p>', { by: 'line' });  // 2
count('Line 1<br>Line 2<br>Line 3', { by: 'l' });      // 3
count('<div><p>Nested</p></div>', { by: 'line' });       // 1 (the wrapper adds no line)
count('a<br><br>b', { by: 'l' });                        // 3 (blank line in the middle)

// Bytes (UTF-8 of the visible text)
count('<p>Café</p>', { by: 'byte' });  // 5

// Custom weight, e.g. approximate LLM tokens
count('<p>Hello world</p>', { measure: s => Math.ceil(s.length / 4) });  // 4

// HTML tags
count('<ul><li>A</li><li>B</li><li>C</li></ul>', { by: 'li' });  // 3
count('<p>Text <img src="a.png"> more <img src="b.png"></p>', { by: 'img' });  // 2

// Non-visible content is ignored
count('<style>.red{color:red}</style><p>Hello</p>');  // 5 (only "Hello")
count('<script>alert(1)</script><p>World</p>');        // 5 (only "World")

// Custom word pattern (CJK)
count('<p>你好世界</p>', { by: 'w' });  // 1 (no spaces = 1 word by default)
count('<p>你好世界</p>', { by: 'w', wordPattern: /[\p{Script=Han}]/gu });  // 4 (each char = 1 word)

// Dictionary-based word splitting via Intl.Segmenter
count('<p>你好世界</p>', { by: 'w', locale: 'zh' });  // 2 (你好 / 世界)
```

### Options

| Option | Type | Default |
|--------|------|---------|
| `by` | [`SplitUnit`](https://github.com/HrDelwar/html-string-splitter#split-units) | `'c'` |
| [`wordPattern`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#wordpattern) | `RegExp` | — |
| [`locale`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#locale) | `string` | — |
| [`measure`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#measure) | `(text) => number` | — |
| [`exclude`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#exclude) | `string[]` | — |
| [`imageWeight`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#imageweight) | `number` | `0` |

---

## `summary(html, options?)` → `SummaryResult` {#summary}

Get full content statistics in a single pass — characters, words, sentences, lines, blocks, tag counts and reading time. More efficient than calling `count()` multiple times.

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
//   tags: { p: 1 },
//   readingTime: 1
// }

// Rich content
summary('<h1>Title</h1><p>First sentence. Second sentence.</p><p>Third.</p>');
// {
//   characters: 43,
//   words: 6,
//   sentences: 4,   (the heading is its own sentence)
//   lines: 3,
//   blocks: 3,
//   tags: { h1: 1, p: 2 },
//   readingTime: 1
// }

// Mixed content with media
summary('<p>Text <img src="photo.jpg"> more <br> end</p>');
// {
//   characters: 15,
//   words: 3,
//   sentences: 2,   (<br> ends a sentence)
//   lines: 2,
//   blocks: 1,      (only p, br is not a block)
//   tags: { p: 1, img: 1, br: 1 },
//   readingTime: 1
// }

// Non-visible elements — text excluded, tags still counted
summary('<style>.x{color:red}</style><p>Visible text.</p>');
// {
//   characters: 13,    (only "Visible text.")
//   words: 2,
//   sentences: 1,
//   lines: 1,
//   blocks: 1,
//   tags: { style: 1, p: 1 },  (style tag counted, its text not)
//   readingTime: 1
// }

// Empty input
summary('');
// { characters: 0, words: 0, sentences: 0, lines: 0, blocks: 0, tags: {}, readingTime: 0 }

// Plain text (no HTML)
summary('Just plain text here.');
// { characters: 21, words: 4, sentences: 1, lines: 1, blocks: 0, tags: {}, readingTime: 1 }

// Reading speed (default 200 words per minute)
summary(longArticle, { wordsPerMinute: 250 }).readingTime;  // minutes, rounded up
```

### SummaryResult

```ts
interface SummaryResult {
  characters: number;              // Grapheme count (visible text only)
  words: number;                   // Word count (visible text only)
  sentences: number;               // Sentence count (visible text only)
  lines: number;                   // Visual lines (see by: 'line')
  blocks: number;                  // Block elements only
  tags: Record<string, number>;    // All tag occurrence counts
  readingTime: number;             // Minutes at wordsPerMinute, rounded up
}
```
