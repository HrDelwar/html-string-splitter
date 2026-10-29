# Excerpt & Snippet

## `excerpt(html, options)` → [`SplitResult`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/split.md#splitresult)

Truncate to a **range** instead of an exact count. The cut lands on the most natural boundary between `min` and `max`: the end of a block, then a sentence, then a word. It never ends on a heading.

```ts
import { excerpt } from 'html-string-splitter';

const post = '<h2>Intro</h2><p>Truncating HTML is hard. Tags must stay balanced.</p><p>This library handles it.</p>';

excerpt(post, { max: 60 });
// {
//   html: '<h2>Intro</h2><p>Truncating HTML is hard. Tags must stay balanced.</p>',
//   truncated: true, total: 78, kept: 54
// }
// Ends at a paragraph, so no ellipsis is added

excerpt('<p>Truncating HTML is hard. Tags must stay balanced and entities intact.</p>', { max: 50, min: 20 });
// { html: '<p>Truncating HTML is hard....</p>', ... }
// No block end in range, so it ends at a sentence
```

If nothing in the range is a boundary, it hard-cuts at `max`, the same as `clip()`.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `max` | `number` | — | **(required)** Upper limit in units |
| `min` | `number` | `max / 2` | Lower limit, the cut is never shorter |
| `prefer` | `('block' \| 'sentence' \| 'word')[]` | `['block', 'sentence', 'word']` | Boundaries to try, in order |
| `smartEllipsis` | `boolean` | `true` | No ellipsis when the cut ends a block |

All [`split()` options](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md) except `keep`, `from`, `preserveWords` and `maxOutputLength` also apply (`by`, `ellipsis`, `suffix`, `stripTags`, `exclude`, `measure`, ...).

---

## `snippet(html, query, options?)` → `string` {#snippet}

Build search-result excerpts: a window of words around each match, with the match highlighted and the HTML kept valid.

```ts
import { snippet } from 'html-string-splitter';

snippet(post, 'balanced', { radius: 3 });
// '…<p>Tags must stay <mark>balanced</mark>.</p><p>This library handles</p>…'

// Plain text output (escaped, safe to insert as HTML)
snippet(post, 'library', { radius: 2, stripTags: true });
// '…balanced. This <mark>library</mark> handles it.'

// No match
snippet(post, 'zebra');
// ''
```

- `query` is a string (case-insensitive, literal) or a `RegExp`.
- Matches can span tags: `hel<b>lo</b>` matches `'hello'` and both parts are highlighted.
- Windows that overlap or touch are merged; distant ones are joined with `separator`.
- The leading and trailing ellipsis is only added where text was actually cut.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `radius` | `number` | `10` | Units kept on each side of a match |
| `by` | `SplitUnit` | `'word'` | Unit for `radius` |
| `maxSnippets` | `number` | `1` | Maximum number of windows |
| `separator` | `string` | `' … '` | Between windows |
| `ellipsis` | `string` | `'…'` | At cut edges |
| `highlight` | `boolean \| HighlightOptions` | `true` | `{ tag, className, attributes }` for the wrapper |
| `stripTags` | `boolean` | `false` | Return escaped plain text with only the highlight markup |
