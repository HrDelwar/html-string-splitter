# Migration

## v2 → v3

The API is the same. Every v2 call still works and the options keep their names. What changed is accuracy: v3 counts and cuts text the way a browser renders it, so some results differ.

### Words and sentences across inline tags

```ts
count('<p>un<b>believ</b>able</p>', { by: 'w' });
// v2: 3   v3: 1

count('<p>This is <b>bold</b> text. Next one.</p>', { by: 's' });
// v2: 4   v3: 2
```

A heading or other block is always its own sentence, so `summary().sentences` can go up by one per heading.

### Lines are visual lines

```ts
count('<div><p>Nested</p></div>', { by: 'l' });   // v2: 2   v3: 1
count('<ul><li>a</li><li>b</li></ul>', { by: 'l' }); // v2: 3   v3: 2
count('Line 1<br>Line 2<br>Line 3', { by: 'l' });  // v2: 2   v3: 3
count('a<br><br>b', { by: 'l' });                  // v2: 2   v3: 3 (blank line)
```

`clip(html, { by: 'l' })` now places the ellipsis inside the last kept line: `<p>A...</p>` instead of `<p>A</p>...`.

### Output keeps the source text

Word and sentence cuts, `splitAt`, `slice`, `chunk`, `wrap` and `highlight` used to rebuild text from decoded words. They now copy the original source:

```ts
clip('<p>a &lt;b&gt;x&lt;/b&gt; c d</p>', { keep: 2, by: 'w' });
// v2: '<p>a <b>x</b>...</p>'              ← escaped text became live markup
// v3: '<p>a &lt;b&gt;x&lt;/b&gt;...</p>'

clip('<p>a\n\n  b   c</p>', { keep: 2, by: 'w' });
// v2: '<p>a b...</p>'   v3: '<p>a\n\n  b...</p>'
```

If you relied on v2 output being decoded, use `output: 'text'` or `text()`.

### Options apply everywhere

`from: 'end'`, `splitAt`, `slice` and `chunk` now honor `exclude`, `stripComments`, `preserveWords`, `wordPattern`, `locale` and `measure`. `exclude` also drops self-closing elements such as `<img>`.

### Skipped content leaves no empty tags

```ts
splitAt('<p>a b</p><p>c d</p>', { at: 2, by: 'w' })[1];
// v2: '<p></p><p>c d</p>'   v3: '<p>c d</p>'
```

### Tokens

- `TokenType` is a runtime object instead of a `const enum`: `TokenType.Text` works in plain JavaScript and with `isolatedModules`.
- New token type `6` (`Directive`) for `<!DOCTYPE>`, `<?...?>` and CDATA. In v2 these were open tags, and truncated output gained a stray `</!doctype>`.
- A bare `<` in text (`a < b`) is text, no longer the start of a tag.

### Smaller changes

- `chunk()` in word mode no longer starts the next chunk with the separating whitespace.
- `summary()` has a new `readingTime` field, and plain text without tags counts as one line.
- Invalid numeric entities (`&#99999999;`) decode to `U+FFFD` instead of throwing.

---

## v1 → v2

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

### 4 new functions

```ts
// summary() — full statistics in one pass
summary('<p>Hello world.</p>');
// { characters: 12, words: 2, sentences: 1, lines: 1, blocks: 1, tags: { p: 1 } }

// pick() — extract pieces by text search or tag
pick('<p>Hello <strong>world</strong></p>', { text: 'world' });
// [{ html: '<strong>world</strong>', text: 'world', start: 6, end: 11 }]

pick('<ul><li>A</li><li>B</li></ul>', { tag: 'li' });
// [{ html: '<li>A</li>', text: 'A', ... }, { html: '<li>B</li>', text: 'B', ... }]

// highlight() — wrap text matches in a tag
highlight('<p>Hello world</p>', 'world');
// '<p>Hello <mark>world</mark></p>'

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
