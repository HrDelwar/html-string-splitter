import { describe, it, expect } from 'vitest';
import { createSplitter, splitStream, clip, split, type StreamOptions } from '../src/index.js';

const article =
  '<!DOCTYPE html><article><h1>Title &amp; more</h1><!-- note -->' +
  '<p>Hello <b>wor</b>ld, this is <a href="/x?a=1&amp;b=2">a link</a>. Next sentence here!</p>' +
  '<style>p { color: red }</style><p>😀 emoji 👨‍👩‍👧 family</p><ul><li>one<li>two</ul><p>tail end</p></article>';

function streamed(html: string, options: StreamOptions, size: number) {
  const s = createSplitter(options);
  let out = '';
  for (let i = 0; i < html.length; i += size) out += s.write(html.slice(i, i + size));
  out += s.end();
  return { out, s };
}

async function readAll(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let out = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return out;
    out += value;
  }
}

describe('createSplitter()', () => {
  const cases: StreamOptions[] = [
    { keep: 0 },
    { keep: 7 },
    { keep: 25 },
    { keep: 3, by: 'w' },
    { keep: 9, by: 'w' },
    { keep: 2, by: 's' },
    { keep: 3, by: 'l' },
    { keep: 2, by: 'p' },
    { keep: 12, by: 'w', exclude: ['a'] },
    { keep: 10, stripTags: true },
    { keep: 8, by: 'w', stripComments: true, smartEllipsis: true },
    { keep: 4, by: 'w', measure: s => s.length },
    { keep: 1000 },
  ];

  for (const options of cases) {
    it(`matches clip() for ${JSON.stringify(options, (_k, v) => (typeof v === 'function' ? 'fn' : v))}`, () => {
      const expected = clip(article, options);
      for (const size of [1, 3, 7, 64, article.length]) {
        expect(streamed(article, options, size).out).toBe(expected);
      }
    });
  }

  it('reports truncated and kept like split()', () => {
    const { s } = streamed(article, { keep: 4, by: 'w' }, 5);
    const r = split(article, { keep: 4, by: 'w' });
    expect(s.done).toBe(true);
    expect(s.truncated).toBe(r.truncated);
    expect(s.kept).toBe(r.kept);
  });

  it('emits output before the input ends', () => {
    const s = createSplitter({ keep: 100, by: 'w' });
    expect(s.write('<p>Hello world and')).toBe('<p>Hello world');
    expect(s.write(' more</p>')).toBe(' and more');
    expect(s.end()).toBe('</p>');
  });

  it('ignores writes after the limit is reached', () => {
    const s = createSplitter({ keep: 2, by: 'w' });
    expect(s.write('<p>a b c d</p>')).toBe('<p>a b...</p>');
    expect(s.done).toBe(true);
    expect(s.write('<p>more</p>')).toBe('');
    expect(s.end()).toBe('');
  });
});

describe('splitStream()', () => {
  it('truncates a ReadableStream and cancels upstream when done', async () => {
    let pulled = 0;
    let cancelled = false;
    const parts = ['<p>one two ', 'three four ', 'five six ', 'seven eight</p>'];
    const source = new ReadableStream<string>({
      pull(controller) {
        if (pulled < parts.length) controller.enqueue(parts[pulled++]);
        else controller.close();
      },
      cancel() {
        cancelled = true;
      },
    });

    expect(await readAll(source.pipeThrough(splitStream({ keep: 3, by: 'w' })))).toBe('<p>one two three...</p>');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(cancelled).toBe(true);
    expect(pulled).toBeLessThan(parts.length);
  });

  it('passes everything through when under the limit', async () => {
    const source = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('<p>a ');
        controller.enqueue('b</p>');
        controller.close();
      },
    });
    expect(await readAll(source.pipeThrough(splitStream({ keep: 10, by: 'w' })))).toBe('<p>a b</p>');
  });
});
