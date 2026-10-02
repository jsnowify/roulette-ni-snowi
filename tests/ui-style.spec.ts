import { mockCounter } from './support';
import { test, expect } from '@playwright/test';
import { buttonText, contrast, correctPalette } from '../src/lib/colors';
import { UI_STYLES } from '../src/data/uiStyles';
import { fontByName, googleFontsUrl } from '../src/lib/fonts';
import { PREVIEW_FIELDS, limitPreviewText } from '../src/data/previewText';

test('contrast math and correction keep two, three, and four color palettes readable', () => {
  expect(contrast('#000000', '#ffffff')).toBe(21);
  expect(contrast('#ffffff', '#ffffff')).toBe(1);
  const palettes = [...UI_STYLES.map(style => style.colors),
    ['#777777', '#777777', '#777777'], ['#ffffff', '#eeeeee', '#ffff00'],
    ['#000000', '#111111', '#222222'], ['#985ba1', '#aa5599', '#99bbff']];
  for (const colors of palettes) {
    for (const count of [2, 3, 4] as const) {
      const [background, ink, third, surface] = correctPalette(colors, count);
      const accent = count === 2 ? ink : third;
      expect(background).toBe(colors[0]);
      expect(contrast(ink, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(accent, background)).toBeGreaterThanOrEqual(3);
      expect(contrast(buttonText(background, ink, accent), accent)).toBeGreaterThanOrEqual(4.5);
      if (count === 4) expect(contrast(ink, surface)).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('palette modes, correction, font direction, and CSS export work on mobile', async ({ page, context }) => {
  await page.route('https://abacus.jasoncameron.dev/**', mockCounter);
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const guide = page.getByRole('region', { name: 'Web UI colors & fonts' });
  await expect(guide.locator('input[type=color]')).toHaveCount(3);
  await guide.getByRole('button', { name: '2 colors' }).click();
  await expect(guide.locator('input[type=color]')).toHaveCount(2);
  await guide.getByLabel('Text color', { exact: true }).fill('#faf9f6');
  await expect(guide.getByText(/Needs correction/).first()).toBeVisible();
  await guide.getByRole('button', { name: 'Correct contrast' }).click();
  await expect(guide.getByText(/Needs correction/)).toHaveCount(0);
  await guide.getByRole('button', { name: '3 colors' }).click();
  await guide.getByLabel('Accent color', { exact: true }).fill('#faf9f6');
  await guide.getByRole('button', { name: 'Correct contrast' }).click();
  await expect(guide.getByText(/Needs correction/)).toHaveCount(0);
  await guide.getByRole('button', { name: 'Try another direction' }).click();
  await expect(guide.getByText('Warm editorial', { exact: true })).toBeVisible();
  await expect(guide.locator('.ui-font-note')).toContainText('Playfair Display / Source Sans 3');
  await guide.getByRole('button', { name: 'Copy UI CSS' }).click();
  await expect(guide.locator('.ui-guide-message')).toHaveText('CSS copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('--font-heading: "Playfair Display", Georgia, serif;');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('font suggestions exist in the catalog and requests deduplicate families', () => {
  for (const style of UI_STYLES) {
    expect(fontByName.has(style.heading)).toBe(true);
    expect(fontByName.has(style.body)).toBe(true);
  }
  const url = googleFontsUrl(['Inter', 'Inter']);
  expect(new URL(url).searchParams.getAll('family')).toEqual(['Inter:wght@400;700']);
  expect(url).toContain('display=swap');
  expect(() => googleFontsUrl(['invalid font'])).toThrow();
  for (const field of PREVIEW_FIELDS) {
    expect(limitPreviewText('x'.repeat(10000), field.limit)).toHaveLength(field.limit);
    expect(limitPreviewText('a\nb\tc', field.limit)).toBe('a b c');
  }
});

test('custom Google Fonts, fourth surface color, and bounded text survive unavailable fonts', async ({ page, context }) => {
  const fontRequests: string[] = [];
  await page.route('https://abacus.jasoncameron.dev/**', mockCounter);
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => {
    fontRequests.push(route.request().url());
    return route.abort();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 812 });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const guide = page.getByRole('region', { name: 'Web UI colors & fonts' });
  await guide.getByRole('combobox', { name: 'Heading font', exact: true }).click();
  await expect(page.getByRole('listbox', { name: 'Heading font options' }).getByRole('option')).toHaveCount(fontByName.size);
  await page.getByRole('option', { name: 'Lora', exact: true }).click();
  await guide.getByRole('combobox', { name: 'Body font', exact: true }).click();
  await page.getByRole('option', { name: 'Roboto', exact: true }).click();
  await expect(guide.locator('.ui-preview h3')).toHaveCSS('font-family', 'Lora, Georgia, serif');
  await expect(guide.locator('.ui-preview')).toHaveCSS('font-family', 'Roboto, Arial, sans-serif');
  await expect.poll(() => fontRequests.some(url => url.includes('family=Lora') && url.includes('family=Roboto'))).toBe(true);
  await expect(guide.locator('.ui-font-status')).toContainText('fallback');
  await guide.getByRole('combobox', { name: 'Heading font', exact: true }).click();
  await page.getByLabel('Search heading fonts', { exact: true }).fill('spam font name');
  await expect(page.getByText(/No matching fonts/)).toBeVisible();
  await expect(guide.locator('.ui-preview h3')).toHaveCSS('font-family', 'Lora, Georgia, serif');
  await page.getByLabel('Search heading fonts', { exact: true }).fill('playfair');
  await expect(page.getByRole('option', { name: 'Playfair Display', exact: true })).toHaveCount(1);
  await page.getByLabel('Search heading fonts', { exact: true }).fill('');
  await expect(page.getByRole('option')).toHaveCount(fontByName.size);
  await page.getByLabel('Search heading fonts', { exact: true }).press('Escape');
  await guide.getByRole('button', { name: '4 colors' }).click();
  await expect(guide.locator('input[type=color]')).toHaveCount(4);
  await guide.getByLabel('Surface color', { exact: true }).fill('#182230');
  await expect(guide.getByText(/Needs correction/).first()).toBeVisible();
  await guide.getByRole('button', { name: 'Correct contrast' }).click();
  await expect(guide.getByText(/Needs correction/)).toHaveCount(0);
  await guide.getByText('Edit preview text', { exact: true }).click();
  for (const field of PREVIEW_FIELDS) {
    const input = guide.getByLabel(field.label, { exact: true });
    // Bypass native maxlength to verify the state-side guard too.
    await input.evaluate((element, text) => {
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, text);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, 'x'.repeat(10000));
    await expect(input).toHaveValue('x'.repeat(field.limit));
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await guide.getByLabel('Headline', { exact: true }).fill('');
  await expect(guide.locator('.ui-preview h3')).toHaveText('Make the unexpected yours.');
  await guide.getByLabel('Headline', { exact: true }).fill('<img src=x onerror=alert(1)>');
  await expect(guide.locator('.ui-preview h3')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(guide.locator('.ui-preview img')).toHaveCount(0);
  await guide.getByRole('button', { name: 'Reset preview text' }).click();
  await expect(guide.getByLabel('Headline', { exact: true })).toHaveValue('Make the unexpected yours.');
  await guide.getByRole('button', { name: 'Copy UI CSS' }).click();
  const css = await page.evaluate(() => navigator.clipboard.readText());
  expect(css).toContain('@import url("https://fonts.googleapis.com/css2?');
  expect(css).toContain('--font-heading: "Lora", Georgia, serif;');
  expect(css).toContain('--ui-surface:');
});
