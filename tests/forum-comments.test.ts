import { describe, it, expect } from 'vitest';
import { split, count, text, splitAt, slice } from '../src/index.js';

describe('forum/comment thread HTML', () => {
  const forumHtml = `
    <div class="thread">
      <div class="comment" data-id="1" data-author="alice">
        <div class="comment-header">
          <img src="alice.jpg" alt="Alice" class="avatar" loading="lazy">
          <span class="username">Alice</span>
          <time datetime="2024-01-15T10:30:00Z">Jan 15, 2024</time>
        </div>
        <div class="comment-body">
          <p>Has anyone tried the new JavaScript framework? I&apos;ve been using it for a week and it&apos;s <strong>amazing</strong>.</p>
          <blockquote>
            <p>Previously, I was using React but this feels much more <em>intuitive</em>.</p>
          </blockquote>
        </div>
      </div>
      <div class="comment reply" data-id="2" data-author="bob" data-parent="1">
        <div class="comment-header">
          <img src="bob.jpg" alt="Bob" class="avatar" loading="lazy">
          <span class="username">Bob</span>
          <time datetime="2024-01-15T11:00:00Z">Jan 15, 2024</time>
        </div>
        <div class="comment-body">
          <p>Totally agree! The <code>useSignal()</code> hook is a game changer. Here&apos;s a quick example:</p>
          <pre><code>const count = useSignal(0);
const double = computed(() =&gt; count.value * 2);</code></pre>
          <p>Much cleaner than <code>useState</code> + <code>useMemo</code> IMO.</p>
        </div>
      </div>
      <div class="comment reply" data-id="3" data-author="charlie" data-parent="1">
        <div class="comment-header">
          <img src="charlie.jpg" alt="Charlie" class="avatar" loading="lazy">
          <span class="username">Charlie</span>
          <time datetime="2024-01-15T14:20:00Z">Jan 15, 2024</time>
        </div>
        <div class="comment-body">
          <p>I&apos;m still skeptical. What about the ecosystem? Can it handle:</p>
          <ol>
            <li>Server-side rendering</li>
            <li>Static site generation</li>
            <li>Edge deployment</li>
          </ol>
          <p>Until those are solid, I&apos;m staying with Next.js &mdash; battle-tested &amp; reliable.</p>
        </div>
      </div>
    </div>
  `;

  it('counts visible text excluding metadata', () => {
    const charCount = count(forumHtml);
    expect(charCount).toBeGreaterThan(200);
  });

  it('splits by word count for preview', () => {
    const result = split(forumHtml, { keep: 20, by: 'w' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(20);
  });

  it('preserves data attributes', () => {
    const result = split(forumHtml, { keep: 100, by: 'c' });
    expect(result.html).toContain('data-id="1"');
    expect(result.html).toContain('data-author="alice"');
  });

  it('preserves code blocks in comments', () => {
    const result = split(forumHtml, { keep: 500, by: 'c' });
    expect(result.html).toContain('<code>');
  });

  it('splits by comment divs', () => {
    const commentCount = count(forumHtml, { by: 'div' });
    expect(commentCount).toBeGreaterThan(3);
  });

  it('handles blockquote and nested content', () => {
    const result = split(forumHtml, { keep: 400, by: 'c' });
    expect(result.html).toContain('<blockquote>');
  });

  it('handles entities in code context', () => {
    const codeHtml = '<pre><code>a &gt; b &amp;&amp; c &lt; d</code></pre>';
    expect(count(codeHtml)).toBe(14);
    expect(text(codeHtml)).toBe('a > b && c < d');
  });

  it('splitAt first comment boundary', () => {
    const [first, rest] = splitAt(forumHtml, { at: 50, by: 'c' });
    expect(first).toContain('Alice');
    expect(rest.length).toBeGreaterThan(0);
  });

  it('extracts text with separator between comments', () => {
    const plainText = text(forumHtml, { separator: ' ' });
    expect(plainText).toContain('Alice');
    expect(plainText).toContain('Bob');
    expect(plainText).toContain('Charlie');
    expect(plainText).not.toContain('&apos;');
  });

  it('slices list items from a comment', () => {
    const result = slice(forumHtml, { start: 0, end: 2, by: 'li' });
    expect(result).toContain('Server-side rendering');
    expect(result).toContain('Static site generation');
    expect(result).not.toContain('Edge deployment');
  });
});
