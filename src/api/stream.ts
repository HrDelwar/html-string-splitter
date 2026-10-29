import type { StreamOptions, StreamSplitter, Token } from '../types.js';
import { TokenType } from '../types.js';
import { Tokenizer } from '../parse/tokenizer.js';
import { decodeEntities } from '../parse/entities.js';
import { resolveOutput, type ResolvedOutput } from '../engine/cut.js';
import { closesBlockNext, Emitter } from '../engine/emit.js';
import { Scanner, type AtomSink } from '../engine/scan.js';
import { resolveSpec } from '../engine/unit.js';
import { isNonNegative, type Pos } from '../engine/util.js';

interface Pending {
  tok: Token;
  ti: number;
  decoded: string;
  off: number;
}

/** Holds tokens until the scanner confirms they belong to kept units, then emits them. */
class Splitter implements StreamSplitter, AtomSink {
  done = false;
  truncated = false;
  kept = 0;
  private accepted = false;
  private readonly tokenizer = new Tokenizer();
  private readonly scanner: Scanner;
  private readonly emitter: Emitter;
  private readonly output: ResolvedOutput;
  private readonly tagMode: boolean;
  private readonly keep: number;
  private pending: Pending[] = [];
  private head = 0;
  private ti = 0;

  constructor(options: StreamOptions) {
    const spec = resolveSpec(options);
    this.tagMode = !!spec.tag;
    this.keep = isNonNegative(options.keep) ? options.keep : 0;
    this.output = resolveOutput(spec, options);
    this.scanner = new Scanner(spec, this);
    this.emitter = new Emitter(this.output.filters);
  }

  write(chunk: string): string {
    if (typeof chunk === 'string' && chunk) this.feedAll(this.tokenizer.write(chunk));
    return this.take();
  }

  end(): string {
    this.feedAll(this.tokenizer.end());
    if (!this.done) this.scanner.finish();
    if (!this.done) {
      this.commit({ ti: Infinity, off: 0 });
      this.done = true;
    }
    return this.take();
  }

  atom(sTi: number, sOff: number, eTi: number, eOff: number, weight: number): void {
    if (this.done) return;
    if (this.kept + weight <= this.keep) {
      this.kept += weight;
      this.accepted = true;
      if (!this.tagMode) this.commit({ ti: eTi, off: eOff });
      return;
    }
    // Batch output keeps markup before the first unit unless keep is 0
    if (this.tagMode || (!this.accepted && this.keep > 0)) this.commit({ ti: sTi, off: this.tagMode ? 0 : sOff });
    this.cut();
  }

  mark(): void {}

  private feedAll(tokens: Token[]): void {
    for (const tok of tokens) {
      if (this.done) return;
      const ti = this.ti++;
      const decoded = tok.type === TokenType.Text && tok.content ? decodeEntities(tok.content) : '';
      this.pending.push({ tok, ti, decoded, off: 0 });
      this.scanner.token(tok, ti, decoded);
      if (this.tagMode && !this.done) this.commit({ ti: ti + 1, off: 0 });
    }
  }

  /** Emit pending tokens up to `pos`, keeping any unemitted text remainder. */
  private commit(pos: Pos): void {
    const p = this.pending;
    while (this.head < p.length) {
      const e = p[this.head];
      if (e.ti < pos.ti) {
        this.emitter.emit(e.tok, e.ti, e.decoded, e.off, e.decoded.length);
        this.head++;
        continue;
      }
      if (e.ti === pos.ti && e.tok.type === TokenType.Text && pos.off > e.off) {
        this.emitter.emit(e.tok, e.ti, e.decoded, e.off, pos.off);
        e.off = pos.off;
      }
      break;
    }
    if (this.head > 64 && this.head * 2 > p.length) {
      this.pending = p.slice(this.head);
      this.head = 0;
    }
  }

  private cut(): void {
    const { ellipsis, suffix, smartEllipsis } = this.output;
    const p = this.pending;
    const head = this.head;
    const clean = smartEllipsis && closesBlockNext(p.length - head, i => p[head + i].tok, i => p[head + i].decoded.slice(p[head + i].off));
    this.emitter.out += (clean ? '' : ellipsis) + suffix + this.emitter.closers();
    this.truncated = true;
    this.done = true;
    this.pending = [];
    this.head = 0;
  }

  private take(): string {
    const s = this.emitter.out;
    this.emitter.out = '';
    return s;
  }
}

/**
 * Truncate HTML incrementally as it arrives (LLM output, SSR, fetch bodies).
 *
 * @param options Same unit options as `split()`; `keep` is required
 * @return A splitter: feed chunks with `write()`, then call `end()`
 */
export function createSplitter(options: StreamOptions): StreamSplitter {
  return new Splitter(options);
}

/**
 * Web Streams wrapper around `createSplitter()`. Stops reading upstream once the limit is reached.
 *
 * @param options Same as `createSplitter()`
 * @return TransformStream of string chunks
 */
export function splitStream(options: StreamOptions): TransformStream<string, string> {
  const splitter = createSplitter(options);
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      const out = splitter.write(chunk);
      if (out) controller.enqueue(out);
      if (splitter.done) controller.terminate();
    },
    flush(controller) {
      const out = splitter.end();
      if (out) controller.enqueue(out);
    },
  });
}
