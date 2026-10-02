import { mockCounter } from './support';
import { test, expect } from '@playwright/test';

test('brand title, descriptive content, and crawl metadata work without JavaScript', async ({ browser, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.goto('http://127.0.0.1:4173/');
  await expect(page).toHaveTitle('Roulette ni snowi');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Roulette ni snowi');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Roulette ni snowi');
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', 'Roulette ni snowi');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /One spin\. One brand\. One week\./);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index, follow/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://roulette-ni-snowi.vercel.app/');
  await expect(page.getByText(/Whatever the roulette gives you becomes the brand/)).toBeVisible();
  const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(schema.map(text => JSON.parse(text)['@type'])).toEqual(['WebSite', 'WebApplication']);
  expect(schema.every(text => JSON.parse(text).name === 'Roulette ni snowi')).toBe(true);
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Allow: /');
  expect(await robots.text()).toContain('Sitemap: https://roulette-ni-snowi.vercel.app/sitemap.xml');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('<loc>https://roulette-ni-snowi.vercel.app/</loc>');
  await context.close();
});

test('rendered app keeps the same brand title and main heading', async ({ page }) => {
  await page.route('https://abacus.jasoncameron.dev/**', mockCounter);
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.goto('/');
  await expect(page).toHaveTitle('Roulette ni snowi');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Roulette ni snowi');
});
