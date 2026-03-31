# Find

## `find(html, query, options?)` → `FindResult[]`

Find text positions across HTML tag boundaries. Searches the visible plain text content and returns character positions.

```ts
import { find } from 'html-string-splitter';

// Simple string search
find('<p>Hello world</p>', 'world');
// [{ start: 6, end: 11, text: 'world' }]

// Search across tag boundaries — text spans multiple elements
find('<p>Hel</p><p>lo world</p>', 'Hello');
// [{ start: 0, end: 5, text: 'Hello' }]

// Multiple matches
find('<p>cat and dog and cat</p>', 'cat');
// [
//   { start: 0, end: 3, text: 'cat' },
//   { start: 16, end: 19, text: 'cat' }
// ]

// Regex search — find all prices
find('<p>Price: $19.99 and $29.99</p>', /\$\d+\.\d+/g);
// [
//   { start: 7, end: 13, text: '$19.99' },
//   { start: 18, end: 24, text: '$29.99' }
// ]

// Regex — case-insensitive
find('<p>Hello HELLO hello</p>', /hello/gi);
// [
//   { start: 0, end: 5, text: 'Hello' },
//   { start: 6, end: 11, text: 'HELLO' },
//   { start: 12, end: 17, text: 'hello' }
// ]

// No matches — returns empty array
find('<p>Hello world</p>', 'xyz');
// []

// Non-visible content is excluded from search
find('<style>.red{color:red}</style><p>Hello</p>', 'red');
// []  (style content is not searchable)

// Special regex characters in string query are escaped automatically
find('<p>Price is $5.00</p>', '$5.00');
// [{ start: 9, end: 14, text: '$5.00' }]

// Empty inputs
find('', 'anything');    // []
find('<p>text</p>', ''); // []
```

### FindResult

```ts
interface FindResult {
  start: number;  // Start position in plain text
  end: number;    // End position in plain text
  text: string;   // Matched text
}
```

### Combining with `slice()`

Use `find()` positions with `slice()` to extract the matching HTML:

```ts
import { find, slice } from 'html-string-splitter';

const html = '<p>The <strong>important</strong> part is here.</p>';
const matches = find(html, 'important');
// [{ start: 4, end: 13, text: 'important' }]

if (matches.length > 0) {
  const { start, end } = matches[0];
  const matchedHtml = slice(html, { start, end, by: 'c' });
  // '<strong>important</strong>'
}
```
