import { describe, it, expect } from 'vitest';
import { split, count, text } from '../src/index.js';

describe('WordPress/CMS output HTML', () => {
  const wpHtml = `
    <div class="entry-content" id="post-42">
      <p class="wp-block-paragraph has-large-font-size">Welcome to our <strong>annual report</strong> for 2024.</p>
      <div class="wp-block-image alignfull">
        <figure class="wp-image-123">
          <img decoding="async" src="https://cdn.example.com/hero.webp" alt="Annual Report Cover" width="1920" height="1080" srcset="https://cdn.example.com/hero-300x169.webp 300w, https://cdn.example.com/hero-768x432.webp 768w, https://cdn.example.com/hero.webp 1920w" sizes="(max-width: 1920px) 100vw, 1920px" class="wp-image-123" loading="lazy">
          <figcaption class="wp-element-caption">Our journey in 2024</figcaption>
        </figure>
      </div>
      <div class="wp-block-columns">
        <div class="wp-block-column">
          <h3>Revenue</h3>
          <p class="has-text-align-center" style="font-size:48px;font-weight:700;color:#2563eb">&dollar;12.5M</p>
          <p>Up 35% from last year, driven by our expansion into Asian markets.</p>
        </div>
        <div class="wp-block-column">
          <h3>Users</h3>
          <p class="has-text-align-center" style="font-size:48px;font-weight:700;color:#16a34a">2.1M</p>
          <p>Active monthly users doubled since Q1 thanks to our mobile-first strategy.</p>
        </div>
      </div>
      <div class="wp-block-separator has-alpha-channel-opacity"></div>
      <h2 class="wp-block-heading">Key Achievements</h2>
      <ul class="wp-block-list">
        <li>Launched in 12 new countries across Asia &amp; Latin America</li>
        <li>Achieved SOC 2 Type II compliance</li>
        <li>Released v3.0 with 50+ new features</li>
        <li>Won &ldquo;Best SaaS Product&rdquo; at TechCrunch Disrupt</li>
      </ul>
      <div class="wp-block-buttons">
        <div class="wp-block-button">
          <a class="wp-block-button__link wp-element-button" href="/download-report">Download Full Report (PDF)</a>
        </div>
      </div>
      <p class="has-small-font-size has-text-color" style="color:#6b7280">Last updated: December 31, 2024. All figures are unaudited.</p>
    </div>
  `;

  it('counts text correctly with WordPress classes', () => {
    const words = count(wpHtml, { by: 'w' });
    expect(words).toBeGreaterThan(50);
  });

  it('preserves WordPress block classes', () => {
    const result = split(wpHtml, { keep: 30, by: 'w' });
    expect(result.html).toContain('wp-block-paragraph');
    expect(result.html).toContain('has-large-font-size');
  });

  it('preserves srcset attribute', () => {
    const result = split(wpHtml, { keep: 50, by: 'w' });
    expect(result.html).toContain('srcset=');
    expect(result.html).toContain('300w');
  });

  it('preserves inline styles', () => {
    const result = split(wpHtml, { keep: 80, by: 'w' });
    expect(result.html).toContain('font-size:48px');
    expect(result.html).toContain('color:#2563eb');
  });

  it('handles dollar entity in financial data', () => {
    expect(count('<p>&dollar;12.5M</p>')).toBe(6);
    expect(text('<p>&dollar;12.5M</p>')).toBe('$12.5M');
  });

  it('counts list items', () => {
    const liCount = count(wpHtml, { by: 'li' });
    expect(liCount).toBe(4);
  });

  it('splits by list items', () => {
    const result = split(wpHtml, { keep: 2, by: 'li' });
    expect(result.kept).toBe(2);
    expect(result.html).toContain('12 new countries');
    expect(result.html).toContain('SOC 2');
    expect(result.html).not.toContain('v3.0');
  });

  it('preserves loading=lazy on images', () => {
    const result = split(wpHtml, { keep: 20, by: 'w' });
    expect(result.html).toContain('loading="lazy"');
    expect(result.html).toContain('decoding="async"');
  });

  it('text extraction with separator handles block columns', () => {
    const plainText = text(wpHtml, { separator: ' ' });
    expect(plainText).toContain('Revenue');
    expect(plainText).toContain('$12.5M');
    expect(plainText).toContain('Users');
    expect(plainText).toContain('2.1M');
  });
});
