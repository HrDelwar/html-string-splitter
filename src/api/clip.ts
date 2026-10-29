import type { SplitOptions } from '../types.js';
import type { HtmlInput } from '../engine/doc.js';
import { split } from './split.js';

export function clip(html: HtmlInput, options: SplitOptions): string {
  return split(html, options).html;
}
