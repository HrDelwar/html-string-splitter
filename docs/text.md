# Text Extraction

## `text(html, options?)` → `string`

Extract plain text from HTML. Strips all tags, decodes entities, and skips non-visible content.

```ts
import { text } from 'html-string-splitter';

// Basic extraction
text('<p>Hello <strong>world</strong></p>');
// 'Hello world'

// Entity decoding
text('<p>Price: &dollar;19.99 &mdash; Save &amp; buy!</p>');
// 'Price: $19.99 — Save & buy!'

// Nested HTML
text('<div><h1>Title</h1><p>Body <em>text</em></p></div>');
// 'TitleBody text'

// Non-visible content skipped
text('<style>.x{color:red}</style><script>alert(1)</script><p>Hello</p>');
// 'Hello'

// Plain text passthrough
text('Already plain text');
// 'Already plain text'

// Empty or invalid input
text('');    // ''
text(null);  // ''
```

### Block Element Separators

By default, text from block elements runs together. Use `separator` to add spacing:

```ts
// Without separator — text runs together
text('<h1>Title</h1><p>Body text</p>');
// 'TitleBody text'

// With space separator
text('<h1>Title</h1><p>Body text</p>', { separator: ' ' });
// 'Title Body text'

// With newline separator
text('<ul><li>Apple</li><li>Banana</li><li>Cherry</li></ul>', { separator: '\n' });
// 'Apple\nBanana\nCherry'

// With custom separator
text('<p>First</p><p>Second</p><p>Third</p>', { separator: ' | ' });
// 'First | Second | Third'
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `separator` | `string` | — | Insert between block elements |

---

## Output Modes via `split()`

The `split()` function supports an `output` option for getting text alongside HTML:

```ts
import { split } from 'html-string-splitter';

// HTML only (default) — no text field in result
const r1 = split('<p>Hello <strong>world</strong></p>', { keep: 7, by: 'c' });
// { html: '<p>Hello <strong>w...</strong></p>', truncated: true, total: 11, kept: 7 }
// r1.text → undefined

// Text only — equivalent to stripTags: true
const r2 = split('<p>Hello <strong>world</strong></p>', { keep: 7, by: 'c', output: 'text' });
// { html: 'Hello w...', truncated: true, total: 11, kept: 7 }

// Both HTML and text — single pass, no duplicate tokenization
const r3 = split('<p>Hello <strong>world</strong></p>', { keep: 7, by: 'c', output: 'both' });
// {
//   html: '<p>Hello <strong>w...</strong></p>',
//   text: 'Hello w',
//   truncated: true,
//   total: 11,
//   kept: 7
// }

// Non-truncated with both
const r4 = split('<p>Hello <strong>world</strong></p>', { keep: 100, by: 'c', output: 'both' });
// {
//   html: '<p>Hello <strong>world</strong></p>',
//   text: 'Hello world',
//   truncated: false,
//   total: 11,
//   kept: 11
// }
```
