import { describe, it, expect } from 'vitest';
import { split, count, text, slice } from '../src/index.js';

describe('markdown-rendered HTML', () => {
  const mdHtml = `
    <h1>Getting Started with TypeScript</h1>
    <p>TypeScript adds <strong>static typing</strong> to JavaScript. Here&apos;s everything you need to know.</p>
    <h2>Installation</h2>
    <p>Install via npm:</p>
    <pre><code class="language-bash">npm install -g typescript</code></pre>
    <h2>Basic Types</h2>
    <p>TypeScript supports several basic types:</p>
    <pre><code class="language-typescript">let name: string = "Alice";
let age: number = 30;
let active: boolean = true;
let items: string[] = ["a", "b", "c"];
let tuple: [string, number] = ["hello", 42];</code></pre>
    <blockquote>
      <p><strong>Note:</strong> TypeScript is a superset of JavaScript &mdash; all valid JS is valid TS.</p>
    </blockquote>
    <h2>Interfaces</h2>
    <pre><code class="language-typescript">interface User {
  name: string;
  email: string;
  age?: number;
}</code></pre>
    <p>Interfaces define the shape of objects. The <code>?</code> makes a property optional.</p>
    <h2>Summary</h2>
    <table>
      <thead><tr><th>Feature</th><th>JavaScript</th><th>TypeScript</th></tr></thead>
      <tbody>
        <tr><td>Types</td><td>Dynamic</td><td>Static + Dynamic</td></tr>
        <tr><td>Compilation</td><td>None</td><td>tsc &rarr; JS</td></tr>
        <tr><td>IDE Support</td><td>Basic</td><td>Full autocomplete</td></tr>
      </tbody>
    </table>
    <p>For more information, visit the <a href="https://typescriptlang.org" target="_blank" rel="noopener">official docs</a>.</p>
  `;

  it('counts text including code blocks', () => {
    const chars = count(mdHtml);
    expect(chars).toBeGreaterThan(300);
  });

  it('splits preserving code blocks', () => {
    const result = split(mdHtml, { keep: 300, by: 'c' });
    expect(result.html).toContain('<pre><code');
  });

  it('preserves language class on code blocks', () => {
    const result = split(mdHtml, { keep: 200, by: 'c' });
    expect(result.html).toContain('class="language-bash"');
  });

  it('handles inline code', () => {
    const inlineHtml = '<p>Use <code>npm install</code> to install.</p>';
    const result = split(inlineHtml, { keep: 20, by: 'c' });
    expect(result.html).toContain('<code>');
  });

  it('splits by heading for TOC', () => {
    const h2Count = count(mdHtml, { by: 'h2' });
    expect(h2Count).toBe(4);
  });

  it('extracts text from code blocks', () => {
    const plainText = text(mdHtml, { separator: ' ' });
    expect(plainText).toContain('npm install -g typescript');
    expect(plainText).toContain('let name: string');
  });

  it('slices table rows', () => {
    const result = slice(mdHtml, { start: 0, end: 2, by: 'tr' });
    expect(result).toContain('Feature');
    expect(result).toContain('Types');
  });

  it('handles blockquote with nested strong', () => {
    const bqHtml = '<blockquote><p><strong>Note:</strong> Important text here.</p></blockquote>';
    const result = split(bqHtml, { keep: 10, by: 'c' });
    expect(result.html).toContain('<strong>');
    expect(result.html).toContain('</blockquote>');
  });

  it('preserves target and rel attributes on links', () => {
    const result = split(mdHtml, { keep: 1000, by: 'c' });
    expect(result.html).toContain('target="_blank"');
    expect(result.html).toContain('rel="noopener"');
  });
});
