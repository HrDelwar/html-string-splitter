# Split & Clip

## `clip(html, options)` → `string`

The simplest way to truncate HTML. Returns the truncated HTML string directly.

```ts
import { clip } from 'html-string-splitter';

// By character (default)
clip('<p>Hello <strong>beautiful</strong> world</p>', { keep: 10, by: 'c' });
// '<p>Hello <strong>beau...</strong></p>'

// By word
clip('<p>Hello beautiful world</p>', { keep: 2, by: 'w' });
// '<p>Hello beautiful...</p>'

// By sentence
clip('<p>First sentence. Second sentence. Third one.</p>', { keep: 2, by: 's' });
// '<p>First sentence. Second sentence...</p>'

// By line (block elements)
clip('<p>Line 1</p><p>Line 2</p><p>Line 3</p>', { keep: 2, by: 'line' });
// '<p>Line 1</p><p>Line 2</p>'

// By HTML tag — keep first 2 list items
clip('<ul><li>Apple</li><li>Banana</li><li>Cherry</li></ul>', { keep: 2, by: 'li' });
// '<ul><li>Apple</li><li>Banana</li></ul>'

// From the end — keep last 2 words
clip('<p>Hello beautiful world</p>', { keep: 2, by: 'w', from: 'end' });
// '...<p>beautiful world</p>'

// With a suffix (e.g., "Read More" button)
clip('<p>Hello beautiful world</p>', { keep: 5, by: 'c', suffix: '<a href="#">More</a>' });
// '<p>Hello...<a href="#">More</a></p>'

// With custom ellipsis
clip('<p>Hello beautiful world</p>', { keep: 5, by: 'c', ellipsis: ' →' });
// '<p>Hello →</p>'

// Strip tags — return plain text
clip('<p>Hello <strong>world</strong></p>', { keep: 7, by: 'c', stripTags: true });
// 'Hello w...'
```

Takes the same options as `split()`.

---

## `split(html, options)` → `SplitResult`

Like `clip()` but returns an object with metadata.

```ts
import { split } from 'html-string-splitter';

const result = split('<p>Hello <strong>beautiful</strong> world</p>', { keep: 10, by: 'c' });
// {
//   html: '<p>Hello <strong>beau...</strong></p>',
//   truncated: true,
//   total: 21,
//   kept: 10
// }

// Not truncated — content fits within limit
const result2 = split('<p>Hello</p>', { keep: 100, by: 'c' });
// {
//   html: '<p>Hello</p>',
//   truncated: false,
//   total: 5,
//   kept: 5
// }

// Conditional "Read More" button
const result3 = split(longArticle, { keep: 200, by: 'c' });
if (result3.truncated) {
  showReadMoreButton();
}

// output: 'both' — get HTML and plain text in one pass (no duplicate tokenization)
const result4 = split('<p>Hello <strong>world</strong></p>', { keep: 100, by: 'c', output: 'both' });
// {
//   html: '<p>Hello <strong>world</strong></p>',
//   text: 'Hello world',
//   truncated: false,
//   total: 11,
//   kept: 11
// }

// Exclude elements — remove figcaption and don't count its text
const result5 = split(
  '<figure><img src="photo.jpg"><figcaption>Photo by John</figcaption></figure><p>Article text here</p>',
  { keep: 50, by: 'c', exclude: ['figcaption'] }
);
// figcaption completely removed from output, its text not counted toward keep

// Image weight — media elements cost characters
const result6 = split(
  '<p>Hello <img src="icon.png"> world</p>',
  { keep: 8, by: 'c', imageWeight: 5 }
);
// "Hello " = 6 chars + <img> = 5 chars = 11 total, exceeds keep of 8
// result6.html → '<p>Hello ...</p>'

// Smart ellipsis — no "..." at block boundaries
const result7 = split(
  '<p>First paragraph</p><p>Second paragraph</p>',
  { keep: 15, by: 'c', smartEllipsis: true }
);
// "First paragraph" is exactly 15 chars, ends at </p> boundary
// result7.html → '<p>First paragraph</p>'  (no "..." since it's a clean block break)

// preserveWords — don't cut mid-word
split('<p>Hello beautiful world</p>', { keep: 8, by: 'c', preserveWords: true });
// { html: '<p>Hello...</p>', ... }  — backtracks from "beauti" to word boundary

// preserveWords with number — scan forward to finish the word
split('<p>Hello beautiful world</p>', { keep: 8, by: 'c', preserveWords: 15 });
// { html: '<p>Hello beautiful...</p>', ... }  — extends up to 15 extra chars to finish "beautiful"

// Selective tag stripping — only strip <span>, keep <p> and <strong>
split('<p>Hello <span class="hl">beautiful</span> <strong>world</strong></p>', {
  keep: 100, by: 'c', stripTags: true, selectiveTags: ['span']
});
// { html: '<p>Hello beautiful <strong>world</strong></p>', ... }

// Strip HTML comments
split('<p>Hello <!-- hidden comment --> world</p>', { keep: 8, by: 'c', stripComments: true });
// { html: '<p>Hello wo...</p>', ... }  — comment removed from output

// Custom word pattern for CJK languages
split('<p>你好世界欢迎光临</p>', { keep: 4, by: 'w', wordPattern: /[\p{Script=Han}]/gu });
// Each Chinese character = 1 word, keeps first 4 characters
```

### [`SplitResult`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/text.md#output-modes-via-split)

```ts
interface SplitResult {
  html: string;       // Processed HTML output
  truncated: boolean; // Whether content was cut
  total: number;      // Total units in original
  kept: number;       // Units kept in output
  text?: string;      // Plain text (when output: 'both')
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `keep` | `number` | — | **(required)** Units to keep |
| `by` | [`SplitUnit`](https://github.com/HrDelwar/html-string-splitter#split-units) | `'c'` | What to count |
| `ellipsis` | `string` | `'...'` / `''` | Appended at truncation point |
| `suffix` | `string` | `''` | HTML after ellipsis |
| [`preserveWords`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#preservewords) | `boolean \| number \| 'trim'` | `false` | Word boundary handling |
| `stripTags` | `boolean` | `false` | Return plain text |
| [`selectiveTags`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#selectivetags) | `string[]` | — | Only strip these tags |
| [`stripComments`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#stripcomments) | `boolean` | `false` | Remove HTML comments |
| [`smartEllipsis`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#smartellipsis) | `boolean` | `false` | Skip ellipsis at block boundaries |
| [`imageWeight`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#imageweight) | `number` | `0` | Character cost for media elements |
| [`exclude`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#exclude) | `string[]` | — | Remove these elements entirely |
| [`wordPattern`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#wordpattern) | `RegExp` | — | Custom word boundary regex |
| [`output`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md#output) | `'html' \| 'text' \| 'both'` | `'html'` | Output format |
| `from` | `'start' \| 'end'` | `'start'` | Direction |

See [Options Reference](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md) for detailed explanations of each option.

---

## `splitAt(html, options)` → `[string, string]` {#splitat}

Split HTML into two valid parts at a position. Both halves have properly closed tags.

```ts
import { splitAt } from 'html-string-splitter';

// Split at 5th character
const [before, after] = splitAt('<p>Hello world</p>', { at: 5, by: 'c' });
// before: '<p>Hello</p>'
// after:  '<p> world</p>'

// Split at 2nd word
const [first, rest] = splitAt('<p>one two three four</p>', { at: 2, by: 'w' });
// first: '<p>one two</p>'
// rest:  '<p>three four</p>'

// Split at 1st list item
const [top, bottom] = splitAt(
  '<ul><li>Apple</li><li>Banana</li><li>Cherry</li></ul>',
  { at: 1, by: 'li' }
);
// top:    '<ul><li>Apple</li></ul>'
// bottom: '<ul><li>Banana</li><li>Cherry</li></ul>'

// Edge cases
splitAt('<p>Hello</p>', { at: 0, by: 'c' });  // ['', '<p>Hello</p>']
splitAt('<p>Hello</p>', { at: 99, by: 'c' }); // ['<p>Hello</p>', '']
```

### Options

| Option | Type | Default |
|--------|------|---------|
| `at` | `number` | — **(required)** |
| `by` | [`SplitUnit`](https://github.com/HrDelwar/html-string-splitter#split-units) | `'c'` |

---

## `slice(html, options?)` → `string` {#slice}

Extract a range from HTML, like `String.slice()`. Supports negative indices.

```ts
import { slice } from 'html-string-splitter';

// Characters 6-11
slice('<p>Hello world</p>', { start: 6, end: 11, by: 'c' });
// '<p>world</p>'

// Last 5 characters
slice('<p>Hello world</p>', { start: -5, by: 'c' });
// '<p>world</p>'

// Words 1-2 (0-indexed)
slice('<p>one two three four</p>', { start: 1, end: 3, by: 'w' });
// '<p>two three</p>'

// 2nd and 3rd list items
slice(
  '<ul><li>A</li><li>B</li><li>C</li><li>D</li></ul>',
  { start: 1, end: 3, by: 'li' }
);
// '<ul><li>B</li><li>C</li></ul>'
```

### Options

| Option | Type | Default |
|--------|------|---------|
| `start` | `number` | `0` |
| `end` | `number` | total |
| `by` | [`SplitUnit`](https://github.com/HrDelwar/html-string-splitter#split-units) | `'c'` |
