import { describe, it, expect } from 'vitest';
import { split, count } from '../src/index.js';

describe('long HTML documents', () => {
  const blogPost = `
    <html>
    <head>
      <meta charset="utf-8">
      <title>My Blog Post</title>
      <style>body { font-family: sans-serif; } .highlight { color: red; }</style>
      <script>console.log('analytics');</script>
    </head>
    <body>
      <header>
        <nav class="main-nav">
          <a href="/" class="logo">Home</a>
          <a href="/about" class="nav-link">About</a>
        </nav>
      </header>
      <main>
        <article class="post">
          <h1>Understanding JavaScript Closures</h1>
          <p class="meta">Published on <time datetime="2024-01-15">January 15, 2024</time> by <a href="/author/john">John Doe</a></p>
          <p>A closure is the combination of a function bundled together with references to its surrounding state. In other words, a closure gives you access to an outer function&apos;s scope from an inner function.</p>
          <h2>Why Closures Matter</h2>
          <p>Closures are important because they control what is and isn&apos;t in scope in a particular function, along with which variables are shared between sibling functions in the same containing scope.</p>
          <pre><code>function makeCounter() {
  let count = 0;
  return function() {
    return count++;
  };
}</code></pre>
          <p>The counter function above <strong>maintains access</strong> to the <code>count</code> variable even after <em>makeCounter</em> has finished executing. This is a <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures" target="_blank" rel="noopener noreferrer">fundamental concept</a> in JavaScript.</p>
          <blockquote cite="https://example.com">
            <p>&ldquo;Closures are one of the most powerful features of JavaScript.&rdquo;</p>
            <footer>&mdash; Expert Developer</footer>
          </blockquote>
          <h2>Practical Examples</h2>
          <p>Here are some common use cases for closures in modern JavaScript development:</p>
          <ul>
            <li>Data privacy and encapsulation</li>
            <li>Function factories and partial application</li>
            <li>Event handlers and callbacks</li>
            <li>Module pattern implementation</li>
          </ul>
          <div class="code-sandbox" data-theme="dark">
            <button onclick="runCode()" class="btn btn-primary" disabled>Run Code</button>
            <textarea readonly rows="10" cols="50">// Try it yourself</textarea>
          </div>
          <figure>
            <img src="closures-diagram.png" alt="Diagram showing closure scope chain" loading="lazy" width="800" height="400">
            <figcaption>Figure 1: How closures capture variables from outer scopes</figcaption>
          </figure>
          <p>In conclusion, understanding closures is <strong>essential</strong> for writing clean, maintainable JavaScript code. They enable powerful patterns like currying, memoization, and the module pattern.</p>
        </article>
        <aside class="sidebar">
          <div class="widget">
            <h3>Related Posts</h3>
            <ul>
              <li><a href="/post/promises">Understanding Promises</a></li>
              <li><a href="/post/async-await">Async/Await Guide</a></li>
            </ul>
          </div>
        </aside>
      </main>
      <footer class="site-footer">
        <p>&copy; 2024 My Blog. All rights reserved.</p>
      </footer>
    </body>
    </html>
  `;

  it('counts only visible text in a full blog post', () => {
    const charCount = count(blogPost, { by: 'c' });
    const wordCount = count(blogPost, { by: 'w' });
    // Should not count title, style, script content
    expect(charCount).toBeGreaterThan(500);
    expect(wordCount).toBeGreaterThan(100);
    // Verify non-visible content is excluded
    expect(count('<title>My Blog Post</title>', { by: 'c' })).toBe(0);
  });

  it('splits blog post by character and produces valid HTML', () => {
    const result = split(blogPost, { keep: 50, by: 'c' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(50);
    expect(result.html).toContain('...');
    // Every close tag should have a matching open tag
    const closes = result.html.match(/<\/([a-z]+)>/gi) ?? [];
    for (const closeTag of closes) {
      const tagName = closeTag.replace(/<\/|>/g, '');
      expect(result.html).toContain(`<${tagName}`);
    }
  });

  it('splits blog post by word count', () => {
    const result = split(blogPost, { keep: 20, by: 'w' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(20);
  });

  it('preserves all attributes in truncated output', () => {
    const result = split(blogPost, { keep: 200, by: 'c' });
    expect(result.html).toContain('class="post"');
    expect(result.html).toContain('class="meta"');
    expect(result.html).toContain('datetime="2024-01-15"');
    expect(result.html).toContain('href="/author/john"');
  });

  it('preserves style and script tags in output', () => {
    const result = split(blogPost, { keep: 100, by: 'c' });
    expect(result.html).toContain('<style>');
    expect(result.html).toContain('font-family: sans-serif');
    expect(result.html).toContain('<script>');
    expect(result.html).toContain("console.log('analytics')");
  });

  it('handles HTML entities in blog post correctly', () => {
    // The blog post contains &apos; &ldquo; &rdquo; &mdash; &copy;
    const totalChars = count(blogPost, { by: 'c' });
    // Each entity should count as 1 character, not the raw length
    expect(totalChars).toBeGreaterThan(0);
    // Specifically test a slice that crosses an entity
    // "It's a great "feature" — really!" = 32 chars (entities each decode to 1 char)
    const entityHtml = '<p>It&apos;s a great &ldquo;feature&rdquo; &mdash; really!</p>';
    expect(count(entityHtml, { by: 'c' })).toBe(32);
  });

  it('handles code blocks without counting them differently', () => {
    const codeHtml = '<pre><code>function foo() { return 42; }</code></pre><p>After code</p>';
    const result = split(codeHtml, { keep: 10, by: 'c' });
    expect(result.truncated).toBe(true);
    expect(result.html).toContain('<pre><code>');
  });

  it('handles deeply nested structure from blog post', () => {
    const result = split(blogPost, { keep: 300, by: 'c' });
    expect(result.truncated).toBe(true);
    // Should contain nested structure
    expect(result.html).toContain('<article');
    expect(result.html).toContain('<main>');
    // All opened tags should be closed
    expect(result.html).toContain('</article>');
    expect(result.html).toContain('</main>');
  });
});
