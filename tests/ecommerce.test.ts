import { describe, it, expect } from 'vitest';
import { split, count } from '../src/index.js';

describe('long HTML documents', () => {
  const ecommercePage = `
    <div class="product-card" data-product-id="SKU-12345" data-category="electronics">
      <div class="product-image">
        <img src="https://cdn.example.com/products/laptop-pro.jpg" alt="Laptop Pro 15 inch" loading="lazy" width="400" height="300">
        <span class="badge badge-sale">-20%</span>
      </div>
      <div class="product-info">
        <h2 class="product-title"><a href="/products/laptop-pro">Laptop Pro 15&quot; &mdash; 2024 Edition</a></h2>
        <div class="product-rating" aria-label="4.5 out of 5 stars">
          <span class="star filled">&#9733;</span>
          <span class="star filled">&#9733;</span>
          <span class="star filled">&#9733;</span>
          <span class="star filled">&#9733;</span>
          <span class="star half">&#9733;</span>
          <span class="review-count">(2,847 reviews)</span>
        </div>
        <p class="product-description">Experience the next generation of computing with the all-new Laptop Pro. Featuring a stunning 15.6&quot; Retina display, Apple M3 Pro chip, 18GB unified memory, and up to 22 hours of battery life. Perfect for professionals, creatives, and power users who demand the best performance on the go.</p>
        <div class="product-specs">
          <ul>
            <li><strong>Processor:</strong> Apple M3 Pro (12-core CPU, 18-core GPU)</li>
            <li><strong>Memory:</strong> 18GB unified memory</li>
            <li><strong>Storage:</strong> 512GB SSD</li>
            <li><strong>Display:</strong> 15.6&quot; Liquid Retina XDR (3456 &times; 2234)</li>
            <li><strong>Battery:</strong> Up to 22 hours</li>
          </ul>
        </div>
        <div class="product-pricing">
          <span class="price-original">&dollar;2,499.00</span>
          <span class="price-sale">&dollar;1,999.00</span>
          <span class="price-savings">You save &dollar;500.00!</span>
        </div>
        <div class="product-actions">
          <button onclick="addToCart('SKU-12345')" class="btn btn-primary btn-lg" data-loading-text="Adding...">
            Add to Cart
          </button>
          <button onclick="addToWishlist('SKU-12345')" class="btn btn-outline" aria-label="Add to wishlist">
            &#9825; Wishlist
          </button>
        </div>
      </div>
    </div>
  `;

  it('handles e-commerce product card with many attributes', () => {
    const result = split(ecommercePage, { keep: 50, by: 'c' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(50);
    // Data attributes preserved
    expect(result.html).toContain('data-product-id="SKU-12345"');
    expect(result.html).toContain('data-category="electronics"');
    // Image with all attributes preserved
    expect(result.html).toContain('loading="lazy"');
    expect(result.html).toContain('width="400"');
  });

  it('counts e-commerce page by word correctly', () => {
    const wordCount = count(ecommercePage, { by: 'w' });
    expect(wordCount).toBeGreaterThan(50);
    const result = split(ecommercePage, { keep: 10, by: 'w' });
    expect(result.kept).toBe(10);
  });

  it('handles HTML entities in product page (quotes, currency, math)', () => {
    // &dollar; decodes to $, so "$2,499.00" = 9 chars
    const priceHtml = '<span>&dollar;2,499.00</span>';
    expect(count(priceHtml, { by: 'c' })).toBe(9);
  });

  it('handles boolean attributes in product page', () => {
    const result = split(ecommercePage, { keep: 300, by: 'c' });
    // Should contain the loading="lazy" from img
    expect(result.html).toContain('loading="lazy"');
  });

  it('handles onclick and aria attributes', () => {
    const buttonHtml = '<button onclick="addToCart(\'SKU-12345\')" class="btn" data-loading-text="Adding...">Add to Cart</button>';
    const result = split(buttonHtml, { keep: 5, by: 'c' });
    expect(result.html).toContain("onclick=\"addToCart('SKU-12345')\"");
    expect(result.html).toContain('data-loading-text="Adding..."');
  });
});
