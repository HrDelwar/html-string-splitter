# Wrap

## `wrap(html, options)` → `string`

Insert wrapper tags at regular intervals. Useful for styling, targeting, or splitting content into visual segments.

```ts
import { wrap } from 'html-string-splitter';

// Wrap every 5 characters in a <span>
wrap('Hello World', { every: 5, by: 'c' });
// '<span>Hello</span><span> Worl</span><span>d</span>'

// Wrap every 2 words
wrap('one two three four five', { every: 2, by: 'w' });
// '<span>one two </span><span>three four </span><span>five</span>'

// Custom tag
wrap('<p>Hello World</p>', { every: 5, by: 'c', tag: 'div' });
// '<div><p>Hello</p></div><div><p> Worl</p></div><div><p>d</p></div>'

// Custom class name
wrap('Hello World', { every: 5, by: 'c', tag: 'span', className: 'chunk' });
// '<span class="chunk">Hello</span><span class="chunk"> Worl</span><span class="chunk">d</span>'

// Custom attributes
wrap('Hello World', {
  every: 5,
  by: 'c',
  tag: 'section',
  attributes: { 'data-page': 'true', role: 'region' }
});
// '<section data-page="true" role="region">Hello</section><section data-page="true" role="region"> Worl</section>...'

// With nested HTML — inner tags are properly closed and reopened at boundaries
wrap('<p><strong>Bold text here</strong></p>', { every: 5, by: 'c' });
// '<span><p><strong>Bold </strong></p></span><span><p><strong>text </strong></p></span><span><p><strong>here</strong></p></span>'
// Each span contains valid, balanced HTML

// Content shorter than `every` — still wrapped once
wrap('<p>Hi</p>', { every: 100, by: 'c' });
// '<span><p>Hi</p></span>'

// Empty or invalid input
wrap('', { every: 5 });  // ''
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `every` | `number` | — | **(required)** Units per wrapper segment |
| `by` | [`SplitUnit`](https://github.com/HrDelwar/html-string-splitter#split-units) | `'c'` | What to count |
| `tag` | `string` | `'span'` | Wrapper element tag |
| `className` | `string` | — | CSS class for wrapper |
| `attributes` | `Record<string, string>` | — | Additional HTML attributes |

### How It Works

The wrapper properly handles nested HTML structure:

1. When a boundary is reached, all currently open inner tags are closed
2. The current wrapper tag is closed
3. A new wrapper tag is opened
4. All previously open inner tags are reopened (with original attributes)

This ensures every wrapper segment contains valid, balanced HTML — no broken tags.

### Use Cases

**Pagination styling** — wrap content into page-sized segments:
```ts
const paged = wrap(article, { every: 500, by: 'c', tag: 'div', className: 'page' });
```

**Highlight intervals** — mark every N words for reading exercises:
```ts
const marked = wrap(text, { every: 10, by: 'w', tag: 'mark' });
```

**Lazy loading sections** — split long content for progressive rendering:
```ts
const sections = wrap(content, {
  every: 3,
  by: 'line',
  tag: 'section',
  attributes: { 'data-lazy': 'true' }
});
```
