import { describe, it, expect } from 'vitest';
import { split, count, text, splitAt } from '../src/index.js';

describe('email HTML template', () => {
  const emailHtml = `
    <html>
    <head><title>Welcome</title><style>body{margin:0}td{padding:8px}</style></head>
    <body>
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto">
        <tr>
          <td style="background:#333;color:#fff;padding:20px;font-size:24px">
            Welcome to Our Service
          </td>
        </tr>
        <tr>
          <td style="padding:20px;font-size:14px;line-height:1.6">
            <p style="margin:0 0 16px">Hi John,</p>
            <p style="margin:0 0 16px">Thank you for signing up! We&apos;re excited to have you on board. Your account has been created successfully and you can start using all our features right away.</p>
            <p style="margin:0 0 16px">Here&apos;s what you can do next:</p>
            <table width="100%" cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse">
              <tr style="background:#f5f5f5"><th>Feature</th><th>Status</th></tr>
              <tr><td>Dashboard</td><td style="color:green">Active</td></tr>
              <tr><td>API Access</td><td style="color:green">Active</td></tr>
              <tr><td>Premium Tools</td><td style="color:orange">Trial</td></tr>
            </table>
            <p style="margin:16px 0"><a href="https://example.com/dashboard" style="background:#007bff;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block">Go to Dashboard</a></p>
            <p style="margin:0;color:#666;font-size:12px">If you didn&apos;t create this account, please <a href="https://example.com/support">contact support</a>.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f5f5f5;padding:16px;font-size:12px;color:#999;text-align:center">
            &copy; 2024 Example Inc. | <a href="https://example.com/unsubscribe" style="color:#999">Unsubscribe</a>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  it('counts only visible text, not style/title', () => {
    const charCount = count(emailHtml);
    expect(charCount).toBeGreaterThan(100);
    expect(count('<title>Welcome</title>')).toBe(0);
  });

  it('preserves inline styles when splitting', () => {
    const result = split(emailHtml, { keep: 30, by: 'c' });
    expect(result.html).toContain('style="');
    expect(result.truncated).toBe(true);
  });

  it('preserves table structure', () => {
    const result = split(emailHtml, { keep: 50, by: 'c' });
    expect(result.html).toContain('cellpadding');
    expect(result.html).toContain('cellspacing');
  });

  it('counts table rows', () => {
    const trCount = count(emailHtml, { by: 'tr' });
    expect(trCount).toBeGreaterThanOrEqual(6);
  });

  it('splits by table rows', () => {
    const result = split(emailHtml, { keep: 3, by: 'tr' });
    expect(result.truncated).toBe(true);
    expect(result.kept).toBe(3);
  });

  it('decodes entities in text extraction', () => {
    const plainText = text(emailHtml, { separator: ' ' });
    expect(plainText).toContain("We're excited");
    expect(plainText).toContain('©');
    expect(plainText).not.toContain('&apos;');
    expect(plainText).not.toContain('&copy;');
  });

  it('handles deeply nested table-in-table', () => {
    const result = split(emailHtml, { keep: 100, by: 'c' });
    const opens = (result.html.match(/<table/g) ?? []).length;
    const closes = (result.html.match(/<\/table>/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});
