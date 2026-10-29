import type { SummaryOptions, SummaryResult } from '../types.js';
import { TokenType } from '../types.js';
import { toDoc, type HtmlInput } from '../engine/doc.js';
import { CountSink, Scanner } from '../engine/scan.js';
import { resolveSpec } from '../engine/unit.js';
import { updateNonVisibleDepth, BLOCK_ELEMENTS } from '../engine/visibility.js';

export function summary(html: HtmlInput, options?: SummaryOptions): SummaryResult {
  const doc = toDoc(html);
  if (!doc) {
    return { characters: 0, words: 0, sentences: 0, lines: 0, blocks: 0, tags: {}, readingTime: 0 };
  }

  const { tokens, decoded } = doc;
  const sinks = [new CountSink(), new CountSink(), new CountSink(), new CountSink()];
  const scanners = (['character', 'word', 'sentence', 'line'] as const).map((by, i) => new Scanner(resolveSpec({ by }), sinks[i]));
  const tags: Record<string, number> = {};
  let blocks = 0;
  let nvDepth = 0;

  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];
    nvDepth = updateNonVisibleDepth(token, nvDepth);
    if (token.type === TokenType.OpenTag || token.type === TokenType.SelfClosingTag) {
      const name = token.tagName!;
      tags[name] = (tags[name] || 0) + 1;
      if (nvDepth === 0 && BLOCK_ELEMENTS.has(name) && name !== 'br' && name !== 'hr') blocks++;
    }
    for (const s of scanners) s.token(token, ti, decoded[ti]);
  }
  for (const s of scanners) s.finish();

  const [characters, words, sentences, lines] = sinks.map(s => s.total);
  const wpm = options?.wordsPerMinute && options.wordsPerMinute > 0 ? options.wordsPerMinute : 200;
  return { characters, words, sentences, lines, blocks, tags, readingTime: words ? Math.ceil(words / wpm) : 0 };
}
