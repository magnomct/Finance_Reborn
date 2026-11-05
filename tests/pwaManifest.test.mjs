import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PWA icon files exist in /public', () => {
  const publicDir = path.resolve('public');
  const requiredFiles = [
    'icon.svg',
    'pwa-192x192.png',
    'pwa-512x512.png',
    'pwa-maskable-512x512.png',
    'apple-touch-icon.png',
    'favicon.ico',
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(publicDir, file);
    assert.ok(fs.existsSync(filePath), `Missing required PWA asset: ${file}`);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 0, `Asset ${file} is empty`);
  }
});

test('index.html includes all required PWA meta tags and link tags', () => {
  const htmlPath = path.resolve('index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('name="theme-color"'), 'Missing theme-color meta tag');
  assert.ok(html.includes('name="mobile-web-app-capable" content="yes"'), 'Missing mobile-web-app-capable');
  assert.ok(html.includes('name="apple-mobile-web-app-capable" content="yes"'), 'Missing apple-mobile-web-app-capable');
  assert.ok(html.includes('name="apple-mobile-web-app-title" content="Yupee"'), 'Missing apple-mobile-web-app-title');
  assert.ok(html.includes('rel="apple-touch-icon"'), 'Missing apple-touch-icon link');
  assert.ok(html.includes('rel="icon" type="image/svg+xml" href="/icon.svg"'), 'Missing SVG icon link');
});
