# Tokenize

## `tokenize(html)` → `Token[]`

Low-level HTML tokenizer. Converts an HTML string into a flat array of tokens in a single pass. This is the same tokenizer used internally by all other functions.

```ts
import { tokenize } from 'html-string-splitter';

// Basic HTML
tokenize('<p>Hello <strong>world</strong></p>');
// [
//   { type: 0, raw: '<p>',         tagName: 'p' },
//   { type: 3, raw: 'Hello ',      content: 'Hello ' },
//   { type: 0, raw: '<strong>',    tagName: 'strong' },
//   { type: 3, raw: 'world',       content: 'world' },
//   { type: 1, raw: '</strong>',   tagName: 'strong' },
//   { type: 1, raw: '</p>',        tagName: 'p' },
// ]

// Self-closing tags
tokenize('<p>Text <br> more <img src="photo.jpg"> end</p>');
// [
//   { type: 0, raw: '<p>',                      tagName: 'p' },
//   { type: 3, raw: 'Text ',                    content: 'Text ' },
//   { type: 2, raw: '<br>',                     tagName: 'br' },
//   { type: 3, raw: ' more ',                   content: ' more ' },
//   { type: 2, raw: '<img src="photo.jpg">',    tagName: 'img', attributes: ' src="photo.jpg"' },
//   { type: 3, raw: ' end',                     content: ' end' },
//   { type: 1, raw: '</p>',                     tagName: 'p' },
// ]

// HTML comments
tokenize('<p>Hello <!-- hidden --> world</p>');
// [
//   { type: 0, raw: '<p>',              tagName: 'p' },
//   { type: 3, raw: 'Hello ',           content: 'Hello ' },
//   { type: 4, raw: '<!-- hidden -->' },
//   { type: 3, raw: ' world',           content: ' world' },
//   { type: 1, raw: '</p>',             tagName: 'p' },
// ]

// Script/style — content captured as RawContent (not parsed as HTML)
tokenize('<script>if (a < b) alert("hi")</script>');
// [
//   { type: 0, raw: '<script>',                        tagName: 'script' },
//   { type: 5, raw: 'if (a < b) alert("hi")' },        // RawContent — not parsed
//   { type: 1, raw: '</script>',                       tagName: 'script' },
// ]

// Attributes with special characters
tokenize('<a href="page.html" title="Click > here">Link</a>');
// [
//   { type: 0, raw: '<a href="page.html" title="Click > here">', tagName: 'a', attributes: ' href="page.html" title="Click > here"' },
//   { type: 3, raw: 'Link', content: 'Link' },
//   { type: 1, raw: '</a>', tagName: 'a' },
// ]

// Doctype, processing instructions and CDATA
tokenize('<!DOCTYPE html><p>a</p>');
// [
//   { type: 6, raw: '<!DOCTYPE html>' },               // Directive
//   { type: 0, raw: '<p>', tagName: 'p' },
//   ...
// ]

// A bare "<" is text, not a tag
tokenize('a < b');
// [ { type: 3, raw: 'a < b', content: 'a < b' } ]

// Plain text (no HTML)
tokenize('Just plain text');
// [
//   { type: 3, raw: 'Just plain text', content: 'Just plain text' },
// ]

// Empty input
tokenize('');
// []
```

### Token Types

| Value | Name | Description | Properties |
|-------|------|-------------|------------|
| `0` | `OpenTag` | `<div>`, `<p class="x">` | `tagName`, `attributes` |
| `1` | `CloseTag` | `</div>`, `</p>` | `tagName` |
| `2` | `SelfClosingTag` | `<br>`, `<img>`, `<hr/>` | `tagName`, `attributes` |
| `3` | `Text` | Plain text content | `content` |
| `4` | `Comment` | `<!-- comment -->` | — |
| `5` | `RawContent` | Inside `<script>`, `<style>`, `<noscript>`, `<iframe>`, ... | — |
| `6` | `Directive` | `<!DOCTYPE>`, `<?xml ?>`, `<![CDATA[ ]]>` | — |

`<textarea>` and `<title>` content is a `Text` token: entities are decoded but tags inside are not parsed.

`TokenType` is exported as a runtime object, so you can compare against names:

```ts
import { tokenize, TokenType } from 'html-string-splitter';

tokenize(html).filter(t => t.type === TokenType.OpenTag && t.tagName === 'a');
```

### Token Interface

```ts
interface Token {
  type: TokenType;     // 0-6
  raw: string;         // Original HTML source (always present)
  tagName?: string;    // Lowercase tag name (for tag tokens)
  attributes?: string; // Raw attribute string (for open/self-closing tags)
  content?: string;    // Text content (for Text tokens, same as raw)
}
```

### Use Cases

**Custom HTML processing** — walk tokens for analysis:
```ts
const tokens = tokenize(html);
const links = tokens.filter(t => t.type === 0 && t.tagName === 'a');
```

**Parse once, use many times** — use [`parse()`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/parse.md) to run several operations without re-tokenizing:
```ts
const doc = parse(html);
doc.count({ by: 'w' });
doc.clip({ keep: 50, by: 'w' });
```

**Build custom transformers** — modify tokens and rebuild HTML:
```ts
const tokens = tokenize(html);
const output = tokens
  .filter(t => t.type !== 4) // remove comments
  .map(t => t.raw)
  .join('');
```

## `Tokenizer` — incremental tokenizing

For input that arrives in pieces. `write()` returns the tokens that are complete; anything unfinished (a half tag, a partial entity, an open `<script>`) waits for the next chunk. `end()` flushes the rest.

```ts
import { Tokenizer } from 'html-string-splitter';

const t = new Tokenizer();
t.write('<p>a &am');  // [{ type: 0, raw: '<p>', ... }, { type: 3, raw: 'a ', ... }]
t.write('p; b</p>');  // [{ type: 3, raw: '&amp; b', ... }, { type: 1, raw: '</p>', ... }]
t.end();              // []
```

The tokens joined back together always equal the input, whatever the chunk boundaries. [Streaming](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/stream.md) is built on this.
