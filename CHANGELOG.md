# Changelog

## 3.0.0

### New

- **`parse(html)`** returns an `HtmlDocument` that tokenizes once and caches unit indexes. Every function also accepts a parsed document. ([docs](docs/parse.md))
- **Budgets**: `measure` gives units a custom weight (LLM tokens, pixel width), `by: 'byte'` counts UTF-8 bytes, `maxOutputLength` limits the returned string including markup. ([docs](docs/options.md#budgets))
- **`locale`** splits words with `Intl.Segmenter` for Chinese, Japanese, Thai and other languages written without spaces.
- **Structure-aware `chunk()`**: `breakAt: 'sentence' | 'block'` with fallback, tables and `<pre>` kept whole, chunks never end on a heading, `meta: true` returns `{ html, text, index, start, end, headings }`. ([docs](docs/chunk.md))
- **`excerpt(html, { min, max })`** picks the most natural cut inside a range. ([docs](docs/excerpt.md))
- **`snippet(html, query)`** builds highlighted search-result excerpts. ([docs](docs/excerpt.md#snippet))
- **Streaming**: `createSplitter()` and `splitStream()` truncate HTML as it arrives and cancel the upstream source at the limit. ([docs](docs/stream.md))
- **`annotate(html, ranges)`** wraps plain-text offset ranges (from NER, LLMs, spell checkers) in markup. Ranges may cross tags, nest and overlap. ([docs](docs/pick.md#annotatehtml-annotations-options--string))
- **`repair(html)`** balances broken or partial HTML: closes open and implied elements, drops stray end tags and a tag cut off at the end. ([docs](docs/repair.md))
- `Tokenizer` class for incremental tokenizing, `Directive` token type, `TokenType` as a runtime object.
- `summary()` returns `readingTime`; `wordsPerMinute` option.
- Full HTML4 entity set plus common HTML5 names.

### Fixed

- Word, sentence, `splitAt`, `slice`, `chunk` and `wrap` output turned escaped text (`&lt;script&gt;`) into live markup.
- Word and sentence cuts collapsed the original whitespace.
- Character cuts kept too many emoji, split ZWJ emoji, and a bare `&` kept text up to the next `;`.
- Words and sentences split by inline tags were counted several times.
- `from: 'end'`, `splitAt`, `slice` and `chunk` ignored most options.
- `exclude` kept self-closing elements.
- `<!DOCTYPE>` produced a `</!doctype>` closing tag; a bare `<` started a tag.
- Implied end tags (`<p>`, `<li>`, `<td>`) were closed twice.
- Invalid numeric entities threw `RangeError`.

### Changed

- Lines (`by: 'line'`) are visual lines. See the [migration guide](docs/migration.md#v2--v3).

### Performance

- `count()` on large documents is up to ~18x faster (cached segmenter, ASCII fast path).
- `chunk()` renders incrementally: 124 ms → 6 ms on a 190 KB document.
