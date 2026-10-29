# Streaming

Truncate HTML **while it arrives**: LLM responses, SSR output, `fetch()` bodies. Output is identical to `clip()` no matter where the chunk boundaries fall, including in the middle of a tag, an entity or an emoji.

## `createSplitter(options)` → `StreamSplitter`

```ts
import { createSplitter } from 'html-string-splitter';

const splitter = createSplitter({ keep: 3, by: 'w' });

splitter.write('<p>one two thr');  // '<p>one two'
splitter.write('ee four</p>');     // ' three...</p>'
splitter.end();                    // ''

splitter.truncated;  // true
splitter.kept;       // 3
```

- `write(chunk)` returns the HTML that is safe to emit now. Text is held back only until the current unit is known to fit.
- Once the limit is reached the splitter closes open tags, sets `done`, and ignores further writes.
- `end()` flushes whatever is left. Under the limit, the output equals the input.

```ts
interface StreamSplitter {
  write(chunk: string): string;
  end(): string;
  readonly done: boolean;
  readonly truncated: boolean;
  readonly kept: number;
}
```

## `splitStream(options)` → `TransformStream<string, string>`

A Web Streams wrapper. When the limit is reached it terminates the stream, which **cancels the upstream source**. With an LLM, that stops generation and you stop paying for tokens nobody will see.

```ts
import { splitStream } from 'html-string-splitter';

const response = await fetch('/api/generate');
const preview = response.body!
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(splitStream({ keep: 200, by: 'w', suffix: ' <a href="/full">Read more</a>' }));

for await (const html of preview) {
  element.insertAdjacentHTML('beforeend', html);
}
```

Works in browsers, Node 18+, Deno, Bun and edge runtimes. For Node streams use `Readable.toWeb()` / `Readable.fromWeb()`.

## Options

Same as [`split()`](https://github.com/HrDelwar/html-string-splitter/blob/master/docs/options.md), minus the options that need the whole document:

| Supported | Not available while streaming |
|-----------|-------------------------------|
| `keep` (required), `by`, `ellipsis`, `suffix`, `stripTags`, `selectiveTags`, `stripComments`, `smartEllipsis`, `exclude`, `imageWeight`, `wordPattern`, `locale`, `measure` | `from: 'end'`, `preserveWords`, `maxOutputLength`, `output: 'both'` |
