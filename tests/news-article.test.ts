import { describe, it, expect } from 'vitest';
import { split, count, text, chunk } from '../src/index.js';

describe('news article HTML', () => {
  const articleHtml = `
    <article class="news-article" itemscope itemtype="https://schema.org/NewsArticle">
      <header>
        <h1 itemprop="headline">Global Tech Summit 2024: Key Takeaways &amp; What&apos;s Next</h1>
        <div class="byline">
          <span itemprop="author">By Sarah Johnson</span> &mdash;
          <time itemprop="datePublished" datetime="2024-03-15">March 15, 2024</time>
        </div>
      </header>
      <figure class="hero-image">
        <img src="summit.jpg" alt="Tech Summit main stage" width="1200" height="630" loading="lazy" itemprop="image">
        <figcaption>The main stage at Global Tech Summit 2024. Photo: Reuters</figcaption>
      </figure>
      <div class="article-body" itemprop="articleBody">
        <p class="lead"><strong>SAN FRANCISCO</strong> &mdash; The annual Global Tech Summit wrapped up yesterday with several groundbreaking announcements that could reshape the technology landscape for years to come.</p>
        <p>More than 50,000 attendees gathered at the Moscone Center for three days of keynotes, workshops, and networking events. The conference featured over 200 sessions covering artificial intelligence, quantum computing, sustainable technology, and cybersecurity.</p>
        <h2>AI Takes Center Stage</h2>
        <p>The biggest buzz surrounded new developments in artificial intelligence. Multiple companies unveiled AI assistants capable of complex reasoning, code generation, and creative problem-solving.</p>
        <p>&ldquo;We&apos;re entering a new era of human-computer collaboration,&rdquo; said Dr. Emily Chen, chief scientist at NeuroTech Labs. &ldquo;The models we&apos;re seeing today aren&apos;t just answering questions &mdash; they&apos;re thinking alongside us.&rdquo;</p>
        <aside class="pullquote">
          <blockquote>
            <p>&ldquo;The models we&apos;re seeing today aren&apos;t just answering questions &mdash; they&apos;re thinking alongside us.&rdquo;</p>
            <cite>&mdash; Dr. Emily Chen, NeuroTech Labs</cite>
          </blockquote>
        </aside>
        <h2>Quantum Computing Breakthrough</h2>
        <p>QuantumCore announced a 1,000-qubit processor that demonstrates &ldquo;quantum advantage&rdquo; on real-world optimization problems. The chip, codenamed <strong>Atlas</strong>, showed a 100&times; speedup over classical computers on supply chain logistics calculations.</p>
        <figure>
          <img src="quantum-chip.jpg" alt="QuantumCore Atlas processor" loading="lazy" width="800" height="450">
          <figcaption>The QuantumCore Atlas processor. Credit: QuantumCore</figcaption>
        </figure>
        <h2>Sustainable Tech Initiatives</h2>
        <p>A coalition of 30 major tech companies signed the &ldquo;Green Cloud Pact,&rdquo; committing to 100% renewable energy for data centers by 2028. The agreement also includes targets for:</p>
        <ul>
          <li>Reducing e-waste by 50% through modular hardware design</li>
          <li>Carbon-neutral supply chains by 2030</li>
          <li>Open-sourcing energy efficiency algorithms</li>
        </ul>
        <h2>Looking Ahead</h2>
        <p>As the tech industry continues to evolve at breakneck speed, one thing is clear: the innovations showcased at this year&apos;s summit will have far-reaching implications across every sector of the economy. Next year&apos;s summit is already scheduled for March 2025 in Tokyo.</p>
      </div>
      <footer class="article-footer">
        <div class="tags">
          <a href="/tag/tech" rel="tag">Technology</a>
          <a href="/tag/ai" rel="tag">AI</a>
          <a href="/tag/quantum" rel="tag">Quantum Computing</a>
        </div>
        <div class="share">
          <a href="#" onclick="share('twitter')" aria-label="Share on Twitter">Twitter</a>
          <a href="#" onclick="share('facebook')" aria-label="Share on Facebook">Facebook</a>
        </div>
      </footer>
    </article>
  `;

  it('counts article text correctly', () => {
    const chars = count(articleHtml);
    const words = count(articleHtml, { by: 'w' });
    expect(chars).toBeGreaterThan(1000);
    expect(words).toBeGreaterThan(200);
  });

  it('splits article for preview (first 50 words)', () => {
    const result = split(articleHtml, { keep: 50, by: 'w' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(50);
    expect(result.html).toContain('itemprop="headline"');
  });

  it('preserves schema.org attributes', () => {
    const result = split(articleHtml, { keep: 100, by: 'w' });
    expect(result.html).toContain('itemscope');
    expect(result.html).toContain('itemprop="headline"');
    expect(result.html).toContain('itemprop="author"');
  });

  it('preserves figure/figcaption structure', () => {
    const result = split(articleHtml, { keep: 200, by: 'w' });
    expect(result.html).toContain('<figure');
    expect(result.html).toContain('<figcaption>');
  });

  it('handles smart quotes and entities throughout', () => {
    const plainText = text(articleHtml, { separator: ' ' });
    expect(plainText).toContain('\u201C');  // left double quote
    expect(plainText).toContain('\u2014');  // em dash
    expect(plainText).toContain('\u00D7');  // multiplication sign
    expect(plainText).not.toContain('&ldquo;');
    expect(plainText).not.toContain('&mdash;');
  });

  it('counts paragraphs by tag', () => {
    const pCount = count(articleHtml, { by: 'p' });
    expect(pCount).toBeGreaterThanOrEqual(8);
  });

  it('splits by paragraph for pagination', () => {
    const result = split(articleHtml, { keep: 3, by: 'p' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(3);
  });

  it('splits by h2 for section navigation', () => {
    const h2Count = count(articleHtml, { by: 'h2' });
    expect(h2Count).toBe(4);
    const result = split(articleHtml, { keep: 2, by: 'h2' });
    expect(result.html).toContain('AI Takes Center Stage');
    expect(result.html).toContain('Quantum Computing Breakthrough');
    expect(result.html).not.toContain('Sustainable Tech');
  });

  it('chunks article into word-based pages', () => {
    const chunks = chunk(articleHtml, { size: 100, by: 'w' });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    chunks.forEach(c => {
      expect(count(c, { by: 'w' })).toBeLessThanOrEqual(100);
    });
  });

  it('preserves onclick and aria attributes in footer', () => {
    const result = split(articleHtml, { keep: 500, by: 'w' });
    if (result.html.includes('share')) {
      expect(result.html).toContain('aria-label=');
    }
  });

  it('counts images', () => {
    const imgCount = count(articleHtml, { by: 'img' });
    expect(imgCount).toBe(2);
  });
});
