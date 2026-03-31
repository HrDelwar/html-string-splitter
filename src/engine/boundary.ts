import type { Token } from '../types.js';
import { TokenType } from '../types.js';
import { decodeEntities } from '../parse/entities.js';
import { BLOCK_ELEMENTS } from './visibility.js';

/**
 * Find the last sentence boundary position (in characters) within the text content
 * of the given tokens. Returns -1 if no sentence boundary found.
 */
export function findLastSentenceEnd(tokens: Token[], maxChars: number): number {
  let charPos = 0;
  let lastSentenceEnd = -1;

  for (const token of tokens) {
    if (token.type === TokenType.Text && token.content) {
      const decoded = decodeEntities(token.content);
      for (let i = 0; i < decoded.length; i++) {
        charPos++;
        if (charPos > maxChars) return lastSentenceEnd;
        const ch = decoded[i];
        if (ch === '.' || ch === '!' || ch === '?') {
          lastSentenceEnd = charPos;
        }
      }
    }
  }

  return lastSentenceEnd;
}

/**
 * Check if the split point falls inside a block element.
 * Returns the character position of the end of the current block, or -1.
 */
export function findBlockEnd(tokens: Token[], splitCharPos: number): number {
  let charPos = 0;
  let inBlock = false;
  let blockEndPos = -1;

  for (const token of tokens) {
    if (token.type === TokenType.OpenTag && BLOCK_ELEMENTS.has(token.tagName!)) {
      inBlock = charPos >= splitCharPos;
    }
    if (token.type === TokenType.CloseTag && BLOCK_ELEMENTS.has(token.tagName!)) {
      if (inBlock) {
        blockEndPos = charPos;
        return blockEndPos;
      }
    }
    if (token.type === TokenType.Text && token.content) {
      const decoded = decodeEntities(token.content);
      charPos += decoded.length;
    }
  }

  return blockEndPos;
}
