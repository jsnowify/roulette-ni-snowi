import { mockCounter } from './support';
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://abacus.jasoncameron.dev/**', mockCounter);
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
});

test('custom reel menu supports keyboard selection, click selection, and saved entries', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/');
  await page.getByText('Add your own entries', { exact: true }).click();
  const reel = page.getByRole('combobox', { name: 'Reel', exact: true });
  await reel.focus();
  await reel.press('ArrowDown');
  await expect(reel).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('listbox', { name: 'Reel options' }).getByRole('option')).toHaveCount(3);
  await reel.press('ArrowDown');
  await reel.press('Enter');
  await expect(reel).toContainText('Category');
  await expect(reel).toBeFocused();
  await page.getByLabel('New entry', { exact: true }).fill('My custom category');
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Your custom entries' })).toContainText('My custom category');
  await reel.click();
  await expect(page.getByRole('option', { name: 'Category', exact: true })).toContainText('1/');
  await page.getByRole('option', { name: 'Mood', exact: true }).click();
  await expect(reel).toContainText('Mood');
  await reel.click();
  await page.locator('.custom-entries .empty').first().click();
  await expect(reel).toHaveAttribute('aria-expanded', 'false');
  await reel.click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await reel.press('Escape');
  await expect(reel).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: /^Spin/ }).click();
  await expect(reel).toBeDisabled();
  await expect(reel).toHaveAttribute('aria-expanded', 'false');
});

test('font menu opens with easing and supports search keyboard selection and tab dismissal', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const heading = page.getByRole('combobox', { name: 'Heading font', exact: true });
  await heading.click();
  const panel = page.locator('.option-panel');
  await expect(panel).toBeVisible();
  await expect.poll(() => panel.evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
  await page.getByLabel('Search heading fonts', { exact: true }).fill('Playfair Display');
  await page.getByLabel('Search heading fonts', { exact: true }).press('Enter');
  await expect(heading).toContainText('Playfair Display');
  await expect(heading).toBeFocused();
  await expect(panel).toHaveCount(0);
  await heading.click();
  await heading.press('Tab');
  await expect(heading).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('combobox', { name: 'Body font', exact: true })).toBeFocused();
});
