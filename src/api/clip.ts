import type { SplitOptions } from '../types.js';
import { split } from './split.js';

export function clip(html: string, options: SplitOptions): string {
  return split(html, options).html;
}
