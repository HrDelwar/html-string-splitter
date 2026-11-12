# Outline & Section

## `outline(html, options?)` → `OutlineItem[]`

The heading tree of a document: build a table of contents, "jump to" links, or a map of a page for RAG.

```ts
import { outline } from 'html-string-splitter';

const html = `<article>
  <h1>Guide</h1><p>Intro text here.</p>
  <h2 id="install">Install</h2><p>Run npm install now.</p>
  <h3>From source</h3><p>Clone the repo and build it.</p>
  <h2>Usage &amp; API</h2><p>Call clip.</p>
</article>`;

outline(html);
// [{
//   level: 1, text: 'Guide', slug: 'guide', index: 0, words: 21,
//   children: [
//     { level: 2, text: 'Install', id: 'install', slug: 'install', index: 1, words: 12,
//       children: [{ level: 3, text: 'From source', slug: 'from-source', index: 2, words: 6, children: [] }] },
//     { level: 2, text: 'Usage & API', slug: 'usage--api', index: 3, words: 2, children: [] },
//   ],
// }]
```

- `text` is the visible heading text with whitespace collapsed; inline tags and entities are handled.
- `id` is the heading's `id` attribute, only present when the HTML has one. Link to `#${item.id}`.
- `slug` is the `id` when present, otherwise a GitHub-style slug of the text (`Usage & API` → `usage--api`), unique within the document (`-1`, `-2`, ...).
- `words` counts the words of the section, subsections included, without the heading itself.
- `index` is the heading's position in the document, for `section()`.
- Headings that skip a level nest under the nearest shallower one; empty headings and headings inside hidden elements are skipped.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxLevel` | `number` | `6` | Deepest level to list. Deeper headings are left out, their words still count toward their parent. |

### `OutlineItem`

```ts
interface OutlineItem {
  level: number;            // 1-6
  text: string;
  id?: string;              // the heading's id attribute
  slug: string;             // id, or a unique slug of the text
  index: number;            // position among all headings
  words: number;            // words in the section, subsections included
  children: OutlineItem[];
}
```

---

## `section(html, target, options?)` → `string`

Balanced HTML of one section: the heading and everything up to the next heading of the same or a higher level.

```ts
import { section } from 'html-string-splitter';

section(html, 'install');
// '<article><h2 id="install">Install</h2><p>Run npm install now.</p>\n  <h3>From source</h3><p>Clone the repo and build it.</p>\n  </article>'

section(html, 'from-source', { includeHeading: false });
// '<article><p>Clone the repo and build it.</p>\n  </article>'

section(html, 'missing');
// ''
```

`target` is matched in this order:

1. the heading's `id`
2. its `slug`
3. its text, case-insensitive
4. a number is the `index` from `outline()`

Ancestor elements are reopened and closed, so the result is valid HTML on its own.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `includeHeading` | `boolean` | `true` | Include the heading element itself |

### Example: one record per section

```ts
import { parse } from 'html-string-splitter';

const doc = parse(html);  // tokenized once for every call below
const records = doc.outline()[0].children.map(item => ({
  url: item.id ? `/guide#${item.id}` : '/guide',
  title: item.text,
  words: item.words,
  html: doc.section(item.index),
}));
```
