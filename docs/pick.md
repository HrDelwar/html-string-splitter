# Pick, Highlight & Annotate

## `pick(html, options)` → `PickResult[]`

Extract pieces from HTML — by text search or by tag name. Text search automatically slices the matching HTML for each result.

### Pick by text

```ts
import { pick } from 'html-string-splitter';

// Simple text search — returns HTML slice for each match
pick('<p>Hello <strong>world</strong></p>', { text: 'world' });
// [{ html: '<strong>world</strong>', text: 'world', start: 6, end: 11 }]

// Multiple matches
pick('<p>cat and dog and cat</p>', { text: 'cat' });
// [
//   { html: 'cat', text: 'cat', start: 0, end: 3 },
//   { html: 'cat', text: 'cat', start: 16, end: 19 }
// ]

// Regex search — find all prices
pick('<p>Price $19.99 and $29.99</p>', { text: /\$\d+\.\d+/g });
// [
//   { html: '$19.99', text: '$19.99', start: 6, end: 12 },
//   { html: '$29.99', text: '$29.99', start: 17, end: 23 }
// ]

// Text across tag boundaries — HTML slice includes the tags
pick('<p>Hel<strong>lo</strong> world</p>', { text: 'Hello' });
// [{ html: '<p>Hel<strong>lo</strong></p>', text: 'Hello', start: 0, end: 5 }]

// Limit results
pick(html, { text: 'error', limit: 1 });  // first match only

// No matches
pick('<p>Hello</p>', { text: 'xyz' });  // []
```

### Pick by tag

```ts
// Pick all list items
pick('<ul><li>Apple</li><li>Banana</li><li>Cherry</li></ul>', { tag: 'li' });
// [
//   { html: '<li>Apple</li>', text: 'Apple', start: 0, end: 1 },
//   { html: '<li>Banana</li>', text: 'Banana', start: 1, end: 2 },
//   { html: '<li>Cherry</li>', text: 'Cherry', start: 2, end: 3 }
// ]

// Pick self-closing tags (images, br, etc.)
pick('<p>Text <img src="a.png"> more <img src="b.png"></p>', { tag: 'img' });
// [
//   { html: '<img src="a.png">', text: '', start: 0, end: 1 },
//   { html: '<img src="b.png">', text: '', start: 1, end: 2 }
// ]

// Pick tags with nested content — inner HTML preserved
pick('<div><p>Hello <strong>world</strong></p><p>Second</p></div>', { tag: 'p' });
// [
//   { html: '<p>Hello <strong>world</strong></p>', text: 'Hello world', start: 0, end: 1 },
//   { html: '<p>Second</p>', text: 'Second', start: 1, end: 2 }
// ]

// Limit
pick(html, { tag: 'li', limit: 2 });  // first 2 items only
```

### [`PickOptions`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/pick.md#pickoptions)

```ts
interface PickOptions {
  tag?: string;              // pick by HTML tag name
  text?: string | RegExp;    // pick by text search
  limit?: number;            // max results
}
```

### PickResult

```ts
interface PickResult {
  html: string;    // matched HTML (with tags)
  text: string;    // plain text content
  start: number;   // start position
  end: number;     // end position
}
```

For **text mode**: `start`/`end` are character positions in the plain text.
For **tag mode**: `start`/`end` are the tag occurrence index (0, 1, 2...).

---

## `highlight(html, query, options?)` → `string`

Find text in HTML and wrap every match in a tag. Only touches text content — never breaks HTML structure.

```ts
import { highlight } from 'html-string-splitter';

// Default — wraps in <mark>
highlight('<p>Hello world</p>', 'world');
// '<p>Hello <mark>world</mark></p>'

// Multiple matches (case-insensitive by default for strings)
highlight('<p>Hello world, hello again</p>', 'hello');
// '<p><mark>Hello</mark> world, <mark>hello</mark> again</p>'

// Works inside nested tags
highlight('<p>Hello <strong>world</strong></p>', 'world');
// '<p>Hello <strong><mark>world</mark></strong></p>'

// Custom tag
highlight('<p>Hello world</p>', 'world', { tag: 'span' });
// '<p>Hello <span>world</span></p>'

// Custom class
highlight('<p>Hello world</p>', 'world', { tag: 'span', className: 'found' });
// '<p>Hello <span class="found">world</span></p>'

// Custom attributes
highlight('<p>Error here</p>', 'Error', {
  tag: 'span',
  className: 'alert',
  attributes: { role: 'alert', 'data-type': 'error' }
});
// '<p><span class="alert" role="alert" data-type="error">Error</span> here</p>'

// Regex — highlight all prices
highlight('<p>Item: $19.99, Tax: $2.00</p>', /\$\d+\.\d+/g);
// '<p>Item: <mark>$19.99</mark>, Tax: <mark>$2.00</mark></p>'

// No matches — returns original HTML unchanged
highlight('<p>Hello world</p>', 'xyz');
// '<p>Hello world</p>'

// Skips non-visible content (script, style)
highlight('<style>.x{color:red}</style><p>red text</p>', 'red');
// '<style>.x{color:red}</style><p><mark>red</mark> text</p>'
```

### [`HighlightOptions`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/pick.md#highlightoptions)

```ts
interface HighlightOptions {
  tag?: string;                        // wrapper element (default: 'mark')
  className?: string;                  // CSS class
  attributes?: Record<string, string>; // extra HTML attributes
}
```

---

## `annotate(html, annotations, options?)` → `string`

Apply ranges found in the **plain text** back onto the HTML. NER models, LLMs, spell checkers and search engines return offsets into text; `annotate()` turns them into markup without breaking the HTML.

```ts
import { annotate, text } from 'html-string-splitter';

const html = '<p>Ada Lovelace met <b>Charles Bab</b>bage in London.</p>';
const plain = text(html);  // 'Ada Lovelace met Charles Babbage in London.'

const entities = findEntities(plain);
// [{ start: 0, end: 12, className: 'person' }, { start: 17, end: 32, className: 'person' }, ...]

annotate(html, entities);
// '<p><mark class="person">Ada Lovelace</mark> met <b><mark class="person">Charles Bab</mark></b><mark class="person">bage</mark> in London.</p>'
```

- Offsets are UTF-16 indexes into `text(html, { separator })`. If you extracted the text with a separator, pass the same `separator` to `annotate()`.
- A range that crosses element boundaries is split into pieces, as `highlight()` does.
- Ranges may nest or overlap, in any order. Nested ranges nest in the output; overlapping ones are split so the result stays valid:

```ts
annotate('<p>abcdefgh</p>', [{ start: 0, end: 5, tag: 'i' }, { start: 3, end: 8, tag: 'u' }]);
// '<p><i>abc<u>de</u></i><u>fgh</u></p>'
```

- Each range can set its own `tag`, `className` and `attributes`; `options` gives the defaults, and attributes from both are merged.
- Out-of-range offsets are clamped; empty or invalid ranges are ignored.

### `Annotation`

```ts
interface Annotation {
  start: number;                       // offset into the plain text
  end: number;                         // exclusive
  tag?: string;
  className?: string;
  attributes?: Record<string, string>;
}

interface AnnotateOptions {
  tag?: string;                        // default wrapper (default: 'mark')
  className?: string;
  attributes?: Record<string, string>;
  separator?: string;                  // separator the offsets were computed with
}
```
