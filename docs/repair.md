# Repair

## `repair(html)` → `string`

Balance broken or partial HTML: CMS fragments, user input, or an LLM response that is still streaming.

```ts
import { repair } from 'html-string-splitter';

repair('<p>Hello <b>world</p><div>');
// '<p>Hello <b>world</b></p><div></div>'

repair('<ul><li>one<li>two</ul>');
// '<ul><li>one</li><li>two</li></ul>'

repair('<div>text</span> more</div>');
// '<div>text more</div>'

repair('<p>Hello <a href="/x');
// '<p>Hello </p>'
```

What it does:

- Closes every element still open at the end.
- Writes the end tags that HTML leaves implied: `<p>`, `<li>`, `<dt>`/`<dd>`, `<tr>`, `<td>`/`<th>`, `<option>`.
- An end tag closes the elements opened inside it first: `<b><i>x</b>` becomes `<b><i>x</i></b>`.
- Drops end tags that close nothing.
- Drops a tag cut off at the end of the input (`<a href="/x`, `</`, `<`) and closes an unterminated comment.
- Leaves everything else byte for byte: attributes, entities, whitespace, comments, `<script>` contents.

Well-formed HTML comes back unchanged.

### Rendering a streamed response

Run `repair()` on everything received so far, on each update:

```ts
let received = '';
for await (const chunk of stream) {
  received += chunk;
  element.innerHTML = repair(received);
}
```

To also stop at a length limit, use [`splitStream()`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/stream.md) instead.

### Not a sanitizer

`repair()` fixes structure, not safety: `<script>` and `onclick` attributes are kept. Sanitize untrusted HTML with a dedicated library such as DOMPurify.
