# Parsed Documents

## `parse(html)` → `HtmlDocument`

Every function tokenizes its input. When you run several operations on the same HTML (count it, clip a preview, chunk it for search), parse it once and reuse the result.

```ts
import { parse } from 'html-string-splitter';

const doc = parse(articleHtml);

doc.count({ by: 'w' });          // 1250
doc.clip({ keep: 40, by: 'w' }); // preview
doc.chunk({ size: 300, by: 'w', breakAt: 'block', meta: true });
doc.summary().readingTime;       // 7
```

`HtmlDocument` tokenizes once and caches:

- the token list (`doc.tokens`)
- decoded text per token
- one unit index per option set, so `count({ by: 'w' })` followed by `clip({ keep: 40, by: 'w' })` scans once

## Methods

Every function in the package is available as a method with the same options:

`split` · `clip` · `count` · `text` · `splitAt` · `slice` · `chunk` · `summary` · `pick` · `highlight` · `wrap` · `excerpt` · `snippet` · `annotate` · `repair`

## Passing a document to functions

All functions accept either a string or a parsed document:

```ts
import { parse, clip, count } from 'html-string-splitter';

const doc = parse(html);
clip(doc, { keep: 100 });
count(doc, { by: 's' });
```

The type is exported as `HtmlInput = string | HtmlDocument`.
