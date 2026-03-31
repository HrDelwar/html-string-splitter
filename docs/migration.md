# Migration from v1

## Quick Reference

| v1 | v2 |
|----|-----|
| `splitByCharacterCount(html, 15)` | `clip(html, { keep: 15 })` |
| `splitByCharacterCount(html, 15, btn)` | `clip(html, { keep: 15, suffix: btn })` |
| `splitByWordCount(html, 6)` | `clip(html, { keep: 6, by: 'w' })` |
| `getCharacterCount(html)` | `count(html)` |
| `getWordCount(html)` | `count(html, { by: 'w' })` |

v1 functions still work but are deprecated and will be removed in a future major version.

## Behavior Differences

### Entity counting

```ts
const html = '<p>A &amp; B</p>';

// v1: counted raw characters → "&amp;" = 5 chars
getCharacterCount(html);  // included entity markup in count

// v2: counts decoded text → "&" = 1 char
count(html);  // 5 ("A & B")
```

### Emoji handling

```ts
const html = '<p>Hello 😀</p>';

// v1: emoji could count as 2 (UTF-16 surrogate pair)
// v2: emoji counts as 1 (uses Intl.Segmenter for grapheme clusters)
count(html);  // 7
```

### Text before tags

```ts
const html = 'Hello <p>world</p>';

// v1: could drop "Hello" since it's outside a tag
// v2: all visible text is counted and preserved
clip(html, { keep: 8, by: 'c' });
// 'Hello <p>wo...</p>'
```

### Return values

```ts
// v1: returned null for invalid input
splitByCharacterCount('', 5);  // null

// v2: returns empty string
clip('', { keep: 5 });  // ''

// v1: returned a string
splitByCharacterCount(html, 5);  // '<p>Hello</p>'

// v2: split() returns an object, clip() returns a string
split(html, { keep: 5 });  // { html: '<p>Hello</p>', truncated: true, total: 11, kept: 5 }
clip(html, { keep: 5 });   // '<p>Hello</p>'
```

### Tag balancing

```ts
const html = '<p>Hello <strong>beautiful world</strong></p>';

// v1: could produce '<p>Hello <strong>beau' (broken tag)
// v2: always balanced HTML
clip(html, { keep: 10, by: 'c' });
// '<p>Hello <strong>beau...</strong></p>'
```

## New in v2.1

### 3 new functions

```ts
// summary() — full statistics in one pass
summary('<p>Hello world.</p>');
// { characters: 12, words: 2, sentences: 1, lines: 1, blocks: 1, tags: { p: 1 } }

// find() — search text across HTML boundaries
find('<p>Hello <strong>world</strong></p>', 'world');
// [{ start: 6, end: 11, text: 'world' }]

// wrap() — insert wrapper tags at intervals
wrap('Hello World', { every: 5, by: 'c' });
// '<span>Hello</span><span> Worl</span><span>d</span>'
```

### tokenize() public API

```ts
tokenize('<p>Hello</p>');
// [{ type: 0, raw: '<p>', tagName: 'p' }, { type: 3, raw: 'Hello', content: 'Hello' }, ...]
```

### Line counting

```ts
count('<p>A</p><p>B</p><br><p>C</p>', { by: 'line' });  // 4
split(html, { keep: 2, by: 'line' });  // first 2 block elements
```

### Advanced split options

```ts
split(html, { keep: 100, by: 'c', exclude: ['figcaption', 'nav'] });
split(html, { keep: 50, by: 'c', imageWeight: 10 });
split(html, { keep: 15, by: 'c', smartEllipsis: true });
split(html, { keep: 100, by: 'c', stripTags: true, selectiveTags: ['span'] });
split(html, { keep: 20, by: 'c', stripComments: true });
split(html, { keep: 10, by: 'w', wordPattern: /[\p{Script=Han}]|[\w]+/gu });
split(html, { keep: 50, by: 'c', output: 'both' });
```

### Chunk enhancements

```ts
// Overlapping chunks for RAG/LLM workflows
chunk(html, { size: 500, by: 'c', overlap: 50 });

// Break at natural boundaries
chunk(html, { size: 100, by: 'c', breakAt: 'word' });
```
