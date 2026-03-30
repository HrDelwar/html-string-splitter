import { describe, it, expect } from 'vitest';
import { split, count } from '../src/index.js';

describe('long HTML documents', () => {
  const multiLanguage = `
    <div lang="en">
      <h1>Hello World</h1>
      <p>Welcome to our site. We support multiple languages &amp; scripts.</p>
    </div>
    <div lang="ja">
      <h1>こんにちは世界</h1>
      <p>私たちのサイトへようこそ。複数の言語とスクリプトをサポートしています。</p>
    </div>
    <div lang="ar" dir="rtl">
      <h1>مرحبا بالعالم</h1>
      <p>مرحبًا بكم في موقعنا. نحن ندعم لغات وبرامج نصية متعددة.</p>
    </div>
    <div lang="ko">
      <h1>안녕하세요 세계</h1>
      <p>우리 사이트에 오신 것을 환영합니다. 여러 언어와 스크립트를 지원합니다.</p>
    </div>
    <div lang="emoji">
      <p>Hello 👋 World 🌍! We ❤️ Unicode 🎉 and emoji 😀👨‍👩‍👧‍👦🇺🇸</p>
    </div>
  `;

  it('counts multi-language content correctly', () => {
    const charCount = count(multiLanguage, { by: 'c' });
    expect(charCount).toBeGreaterThan(100);
  });

  it('splits Japanese text by character', () => {
    const jpHtml = '<p>こんにちは世界</p>';
    const result = split(jpHtml, { keep: 3, by: 'c' });
    expect(result.kept).toBe(3);
    expect(result.html).toBe('<p>こんに...</p>');
  });

  it('splits Arabic RTL text', () => {
    const arHtml = '<p dir="rtl">مرحبا بالعالم</p>';
    const result = split(arHtml, { keep: 5, by: 'c' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(5);
    expect(result.html).toContain('dir="rtl"');
  });

  it('splits Korean text by word', () => {
    const koHtml = '<p>안녕하세요 세계</p>';
    const result = split(koHtml, { keep: 1, by: 'w' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(1);
  });

  it('handles emoji in multi-language content', () => {
    const emojiHtml = '<p>Hello 👋 World 🌍! We ❤️ Unicode 🎉 and emoji 😀👨‍👩‍👧‍👦🇺🇸</p>';
    const charCount = count(emojiHtml, { by: 'c' });
    // Each emoji = 1 grapheme
    expect(charCount).toBeGreaterThan(30);
    const result = split(emojiHtml, { keep: 8, by: 'c' });
    expect(result.kept).toBe(8);
    expect(result.html).toContain('👋');
  });

  it('handles mixed language split across tags', () => {
    const result = split(multiLanguage, { keep: 30, by: 'c' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(30);
  });

  it('handles large repetitive HTML efficiently', () => {
    const row = '<tr><td class="col-name">John Doe</td><td class="col-email">john@example.com</td><td class="col-role">Admin</td></tr>';
    const largeTable = '<table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>' + row.repeat(500) + '</tbody></table>';
    const start = performance.now();
    const result = split(largeTable, { keep: 100, by: 'w' });
    const elapsed = performance.now() - start;
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(100);
    expect(elapsed).toBeLessThan(100); // should be fast
  });
});
