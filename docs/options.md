# Options Reference

All options available for `split()` and `clip()`. Start with the basic options — most use cases only need `keep`, `by`, and maybe `ellipsis`.

---

## Basic Options

### `keep` (required)
Number of units to keep from the content.

```ts
split(html, { keep: 10 });  // keep first 10 characters
```

### `by`
What to split by. Default: `'character'`.

| Value | Alias | Description |
|-------|-------|-------------|
| `'character'` | `'c'` | Grapheme clusters (emoji-safe) |
| `'word'` | `'w'` | Whitespace-separated words |
| `'sentence'` | `'s'` | Sentence boundaries (`.!?`) |
| `'line'` | `'l'` | Block elements + `<br>` |
| Any tag name | — | e.g. `'p'`, `'li'`, `'img'` |

```ts
split(html, { keep: 5, by: 'w' });     // 5 words
split(html, { keep: 2, by: 's' });     // 2 sentences
split(html, { keep: 3, by: 'line' });  // 3 lines
split(html, { keep: 2, by: 'p' });     // 2 paragraphs
```

### `from`
Direction of truncation. Default: `'start'`.

```ts
// Keep first 5 words
split(html, { keep: 5, by: 'w', from: 'start' });

// Keep last 5 words
split(html, { keep: 5, by: 'w', from: 'end' });
// '...<p>last five words here</p>'
```

### `stripTags`
When `true`, removes all HTML tags from output, returning plain text. Default: `false`.

```ts
split('<p>Hello <strong>world</strong></p>', { keep: 7, by: 'c', stripTags: true });
// { html: 'Hello w...' }
```

---

## Ellipsis & Suffix

### `ellipsis`
String appended at the truncation point. Default: `'...'` for text units, `''` for tag units.

```ts
split('<p>Hello world</p>', { keep: 5, by: 'c' });
// { html: '<p>Hello...</p>' }

split('<p>Hello world</p>', { keep: 5, by: 'c', ellipsis: ' →' });
// { html: '<p>Hello →</p>' }

split('<p>Hello world</p>', { keep: 5, by: 'c', ellipsis: '' });
// { html: '<p>Hello</p>' }
```

### `suffix`
HTML appended after the ellipsis. Useful for "Read More" links:

```ts
split('<p>Hello world</p>', { keep: 5, by: 'c', suffix: '<a href="#">More</a>' });
// { html: '<p>Hello...<a href="#">More</a></p>' }
```

---

## Advanced Options

> Most users don't need these. The basic options above cover the majority of use cases.

### `smartEllipsis`
When `true`, skips the ellipsis if truncation happens at a block-level boundary (e.g., after `</p>`). Default: `false`.

```ts
const html = '<p>First paragraph</p><p>Second paragraph</p>';

// Without smartEllipsis — always adds "..."
split(html, { keep: 15, by: 'c' });
// { html: '<p>First paragraph...</p>' }

// With smartEllipsis — no "..." at clean block breaks
split(html, { keep: 15, by: 'c', smartEllipsis: true });
// { html: '<p>First paragraph</p>' }
// "First paragraph" = 15 chars, ends at </p> boundary → no ellipsis needed

// Mid-paragraph — still adds "..."
split(html, { keep: 10, by: 'c', smartEllipsis: true });
// { html: '<p>First para...</p>' }
// Cut is mid-text, not at a block boundary → ellipsis shown
```

---

## Word Handling

### `preserveWords`
Controls word boundary behavior when splitting by character. Default: `false`.

| Value | Behavior |
|-------|----------|
| `false` | Cut at exact character count |
| `true` | Backtrack to last word boundary (drop partial word) |
| `'trim'` | Same as `true` |
| `number` | Scan forward up to N extra characters to finish the word |

```ts
const html = '<p>Hello beautiful world</p>';

// false — cuts exactly at 8 characters
split(html, { keep: 8, by: 'c' });
// { html: '<p>Hello be...</p>', kept: 8 }

// true — backtracks to word boundary
split(html, { keep: 8, by: 'c', preserveWords: true });
// { html: '<p>Hello...</p>', kept: 5 }

// 'trim' — same behavior as true
split(html, { keep: 8, by: 'c', preserveWords: 'trim' });
// { html: '<p>Hello...</p>', kept: 5 }

// number — scan forward up to N extra chars to finish the word
split(html, { keep: 8, by: 'c', preserveWords: 15 });
// { html: '<p>Hello beautiful...</p>', kept: 15 }
// Extended from 8 to 15 chars to finish "beautiful"
```

### `wordPattern`
Custom regex for word detection. Default: split on whitespace.

Useful for CJK languages where words aren't space-separated:

```ts
// Default — Chinese text is 1 "word" (no spaces)
count('<p>你好世界</p>', { by: 'w' });  // 1

// Custom pattern — each character is a word
count('<p>你好世界</p>', { by: 'w', wordPattern: /[\p{Script=Han}]/gu });  // 4

// Mixed CJK and Latin
split('<p>Hello你好World世界</p>', {
  keep: 3,
  by: 'w',
  wordPattern: /[\p{Script=Han}]|[a-zA-Z]+/gu
});
// Matches: ["Hello", "你", "好", "World", "世", "界"] → keeps first 3
```

---

## Tag Handling

### `selectiveTags`
When used with `stripTags: true`, only strips the specified tags (keeps all others):

```ts
const html = '<p>Hello <span class="hl">beautiful</span> <strong>world</strong></p>';

// stripTags alone — strips everything
split(html, { keep: 100, by: 'c', stripTags: true });
// { html: 'Hello beautiful world' }

// selectiveTags — only strip <span>, keep <p> and <strong>
split(html, { keep: 100, by: 'c', stripTags: true, selectiveTags: ['span'] });
// { html: '<p>Hello beautiful <strong>world</strong></p>' }

// Strip multiple specific tags
split(html, { keep: 100, by: 'c', stripTags: true, selectiveTags: ['span', 'strong'] });
// { html: '<p>Hello beautiful world</p>' }

// selectiveTags without stripTags — has no effect
split(html, { keep: 100, by: 'c', selectiveTags: ['span'] });
// { html: '<p>Hello <span class="hl">beautiful</span> <strong>world</strong></p>' }
```

### `stripComments`
When `true`, removes HTML comments from output. Default: `false`.

```ts
const html = '<p>Hello <!-- secret --> world</p>';

// Default — comments preserved
split(html, { keep: 20, by: 'c' });
// { html: '<p>Hello <!-- secret --> world</p>' }

// stripComments — comments removed
split(html, { keep: 20, by: 'c', stripComments: true });
// { html: '<p>Hello  world</p>' }

// Works with tag-based splitting too
split('<!-- nav --><ul><li>A</li></ul>', { keep: 1, by: 'li', stripComments: true });
// { html: '<ul><li>A</li></ul>' }
```

### `exclude`
Array of tag names to completely remove (both the tag and its content). Excluded content is NOT counted toward `keep`:

```ts
// Remove figcaption — its text doesn't count toward the limit
split(
  '<figure><img src="x"><figcaption>Caption text</figcaption></figure><p>Article body</p>',
  { keep: 100, by: 'c', exclude: ['figcaption'] }
);
// { html: '<figure><img src="x"></figure><p>Article body</p>' }

// Remove script tags
split(
  '<p>Hello</p><script>alert("xss")</script><p>World</p>',
  { keep: 100, by: 'c', exclude: ['script'] }
);
// { html: '<p>Hello</p><p>World</p>' }

// Remove multiple elements
split(html, { keep: 50, by: 'c', exclude: ['nav', 'footer', 'aside'] });

// Remove self-closing elements
split('<p>Text <hr> more</p>', { keep: 100, by: 'c', exclude: ['hr'] });
// { html: '<p>Text  more</p>' }

// Works with tag-based splitting too
split('<ul><li>A</li><nav>Nav</nav><li>B</li></ul>', { keep: 2, by: 'li', exclude: ['nav'] });
// { html: '<ul><li>A</li><li>B</li></ul>' }
```

---

## Media Handling

### `imageWeight`
Character cost assigned to media elements (`<img>`, `<svg>`, `<video>`, `<audio>`, `<picture>`, `<canvas>`, `<iframe>`). Default: `0`.

```ts
// Without imageWeight — images are "free"
split('<p>Hello <img src="x"> world</p>', { keep: 8, by: 'c' });
// { html: '<p>Hello <img src="x"> wo...</p>', kept: 8 }

// With imageWeight — each image costs 5 characters
split('<p>Hello <img src="x"> world</p>', { keep: 8, by: 'c', imageWeight: 5 });
// "Hello " = 6 chars, <img> = 5 chars → total 11, exceeds keep of 8
// { html: '<p>Hello ...</p>', kept: 6, total: 16 }

// Multiple images
split('<p>A <img> B <img> C</p>', { keep: 10, by: 'c', imageWeight: 3 });
// "A " (2) + img (3) + " B " (3) + img (3) = 11 > 10
// Truncates before second image

// Also works with <video>, <svg>, etc.
split('<div><video src="v.mp4"></video><p>Text</p></div>', { keep: 5, by: 'c', imageWeight: 10 });
// <video> costs 10 chars → exceeds keep of 5, truncated
```

---

## Output Format

### `output`
Controls what is returned. Default: `'html'`.

| Value | Behavior |
|-------|----------|
| `'html'` | Standard HTML output (default) |
| `'text'` | Plain text (equivalent to `stripTags: true`) |
| `'both'` | Returns both `html` and `text` fields in a single pass |

```ts
// HTML only (default)
const r1 = split('<p>Hello <strong>world</strong></p>', { keep: 7, by: 'c' });
// { html: '<p>Hello <strong>w...</strong></p>', truncated: true }
// r1.text → undefined

// Text only
const r2 = split('<p>Hello <strong>world</strong></p>', { keep: 7, by: 'c', output: 'text' });
// { html: 'Hello w...', truncated: true }

// Both — HTML and text in one pass
const r3 = split('<p>Hello <strong>world</strong></p>', { keep: 7, by: 'c', output: 'both' });
// {
//   html: '<p>Hello <strong>w...</strong></p>',
//   text: 'Hello w',
//   truncated: true,
//   total: 11,
//   kept: 7
// }

// Works with tag-based splitting too
const r4 = split('<ul><li>Hello</li><li>World</li></ul>', { keep: 1, by: 'li', output: 'both' });
// { html: '<ul><li>Hello</li></ul>', text: 'Hello', ... }
```
