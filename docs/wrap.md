# Wrap

## `wrap(html, options)` → `string`

Insert wrapper tags at regular intervals — by character count, word count, or HTML tag count.

### By character

```ts
import { wrap } from 'html-string-splitter';

wrap('Hello World', { every: 5, by: 'c' });
// '<span>Hello</span><span> Worl</span><span>d</span>'

wrap('Hello World', { every: 5, by: 'c', tag: 'div' });
// '<div>Hello</div><div> Worl</div><div>d</div>'

wrap('Hello World', { every: 5, by: 'c', className: 'chunk' });
// '<span class="chunk">Hello</span><span class="chunk"> Worl</span><span class="chunk">d</span>'
```

### By word

```ts
wrap('one two three four five', { every: 2, by: 'w' });
// '<span>one two</span><span>three four</span><span>five</span>'
```

### By HTML tag

Wrap every N occurrences of a tag in a wrapper element:

```ts
// Group list items into pages of 2
wrap('<li>A</li><li>B</li><li>C</li><li>D</li><li>E</li>', { every: 2, by: 'li', tag: 'ul' });
// '<ul><li>A</li><li>B</li></ul><ul><li>C</li><li>D</li></ul><ul><li>E</li></ul>'

// Group images into gallery rows of 3
wrap('<img src="1"><img src="2"><img src="3"><img src="4"><img src="5">', {
  every: 3,
  by: 'img',
  tag: 'div',
  className: 'gallery-row'
});
// '<div class="gallery-row"><img src="1"><img src="2"><img src="3"></div>
//  <div class="gallery-row"><img src="4"><img src="5"></div>'

// Group table rows for lazy loading
wrap('<tr><td>1</td></tr><tr><td>2</td></tr><tr><td>3</td></tr>', {
  every: 2,
  by: 'tr',
  tag: 'tbody',
  attributes: { 'data-lazy': 'true' }
});
// '<tbody data-lazy="true"><tr><td>1</td></tr><tr><td>2</td></tr></tbody>
//  <tbody data-lazy="true"><tr><td>3</td></tr></tbody>'

// Group paragraphs into sections
wrap('<p>First</p><p>Second</p><p>Third</p><p>Fourth</p>', { every: 2, by: 'p', tag: 'section' });
// '<section><p>First</p><p>Second</p></section><section><p>Third</p><p>Fourth</p></section>'
```

### With nested HTML

Inner tags are properly closed and reopened at boundaries:

```ts
wrap('<p><strong>Bold text here</strong></p>', { every: 5, by: 'c' });
// '<span><p><strong>Bold </strong></p></span><span><p><strong>text </strong></p></span><span><p><strong>here</strong></p></span>'
```

### Custom attributes

All options (`tag`, `className`, `attributes`) work with both text and tag modes:

```ts
wrap('<li>A</li><li>B</li><li>C</li>', {
  every: 2,
  by: 'li',
  tag: 'ul',
  className: 'page',
  attributes: { role: 'list', 'data-page': 'true' }
});
// '<ul class="page" role="list" data-page="true"><li>A</li><li>B</li></ul>
//  <ul class="page" role="list" data-page="true"><li>C</li></ul>'
```

### Edge cases

```ts
wrap('<p>Hi</p>', { every: 100, by: 'c' });  // '<span><p>Hi</p></span>'
wrap('', { every: 5 });                        // ''
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `every` | `number` | — | **(required)** Units per wrapper segment |
| `by` | [`SplitUnit`](https://github.com/HrDelwar/html-string-splitter#split-units) | `'c'` | Characters, words, or any tag name |
| `tag` | `string` | `'span'` | Wrapper element tag |
| `className` | `string` | — | CSS class for wrapper |
| `attributes` | `Record<string, string>` | — | Additional HTML attributes |
