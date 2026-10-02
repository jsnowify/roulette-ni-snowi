import { mockCounter } from './support';
import { test, expect } from '@playwright/test';
import { suggestedStyle } from '../src/lib/styleSuggestion';

test.beforeEach(async ({ page }) => {
  await page.route('https://abacus.jasoncameron.dev/**', mockCounter);
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
});

for (const width of [280, 320, 375, 390, 540, 720, 768, 960, 1280, 1440, 1920, 2560]) {
  test(`menus stay reachable at ${width}px, including short viewports`, async ({ page }) => {
    const height = width >= 720 ? 360 : 640;
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await page.getByText('Add your own entries', { exact: true }).click();
    const reel = page.getByRole('combobox', { name: 'Reel', exact: true });
    await reel.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const rect = document.querySelector('.custom-form .option-trigger')!.getBoundingClientRect();
      window.scrollTo({ top: scrollY + rect.top - innerHeight + 70, behavior: 'instant' });
    });
    await reel.click();
    const panel = page.locator('.option-panel');
    await expect.poll(async () => {
      const box = await panel.boundingBox();
      return !!box && box.y >= 0 && box.y + box.height <= height;
    }).toBe(true);
    await expect(page.locator('.option-check')).toHaveCount(0);
    if (width === 390) await page.screenshot({ path: `test-results/menu-audit-${test.info().project.name}.png` });
    await page.getByRole('option', { name: 'Mood', exact: true }).click();
    await expect(reel).toContainText('Mood');
    await page.getByRole('combobox', { name: 'Heading font', exact: true }).click();
    const list = page.getByRole('listbox', { name: 'Heading font options' });
    await expect(list).toHaveCSS('scrollbar-width', 'none');
    const old = await list.evaluate(element => element.scrollTop);
    await list.hover();
    await page.mouse.wheel(0, 400);
    await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeGreaterThan(old);
    await page.getByLabel('Search heading fonts', { exact: true }).fill('Lora');
    await page.getByRole('option', { name: 'Lora', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('accepting a shared brand preserves palette exploration, text, and palette size', async ({ page }) => {
  expect(suggestedStyle({ brand: 'Example', category: 'Luxury', mood: 'Dark' })).toBe(2);
  expect(suggestedStyle({ brand: 'Example', category: 'Luxury', mood: 'Calm' })).toBe(3);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?brand=Hoshi&category=Luxury&mood=Dark');
  const guide = page.getByRole('region', { name: 'Web UI colors & fonts' });
  await expect(guide.locator('.ui-style-name')).toHaveText('Night interface');
  await expect(guide.locator('.ui-suggestion-note')).toContainText('just a suggestion');
  await guide.getByRole('button', { name: '4 colors' }).click();
  await guide.getByText('Edit preview text', { exact: true }).click();
  await guide.getByLabel('Headline', { exact: true }).fill('My own headline');
  await guide.getByRole('button', { name: 'Try another direction' }).click();
  await expect(guide.locator('.ui-style-name')).toHaveText('Fresh product');
  // Exploring expression never changes the assigned brand or resets custom copy.
  await expect(page.locator('.spin')).toBeDisabled();
  await expect(page.getByRole('button', { name: "Today's challenge", exact: true })).toBeDisabled();
  await page.getByRole('button', { name: /^Accept challenge/ }).click();
  await expect(page.locator('.brief')).toContainText('Hoshi');
  await expect(guide.locator('.ui-style-name')).toHaveText('Fresh product');
  await expect(guide.getByRole('button', { name: '4 colors', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(guide.getByLabel('Headline', { exact: true })).toHaveValue('My own headline');
  await expect(guide.getByText(/Needs correction/)).toHaveCount(0);
});

for (const platform of ['Android', 'iOS']) {
  test(`Messenger ${platform} emulation supports touch menus, rotation, and unavailable APIs`, async ({ browser, browserName }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browserName !== 'firefox',
      userAgent: platform === 'Android'
        ? 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 [FBAN/Orca-Android]'
        : 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS]',
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://abacus.jasoncameron.dev/**', route => route.abort());
    await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined });
      Object.defineProperty(window, 'AudioContext', { value: undefined });
      document.execCommand = () => false;
    });
    await page.goto('/');
    await page.getByText('Add your own entries', { exact: true }).tap();
    const reel = page.getByRole('combobox', { name: 'Reel', exact: true });
    await reel.tap();
    await page.getByRole('option', { name: 'Mood', exact: true }).tap();
    await expect(reel).toContainText('Mood');
    const heading = page.getByRole('combobox', { name: 'Heading font', exact: true });
    await heading.tap();
    const list = page.getByRole('listbox', { name: 'Heading font options' });
    await list.evaluate(element => { element.scrollTop += 500; });
    expect(await list.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await page.getByLabel('Search heading fonts', { exact: true }).fill('Lora');
    // Simulate reduced viewport height when a mobile keyboard is visible.
    await page.setViewportSize({ width: 390, height: 430 });
    const panel = page.locator('.option-panel');
    await expect.poll(async () => {
      const box = await panel.boundingBox();
      return !!box && box.y >= 0 && box.y + box.height <= 430;
    }).toBe(true);
    await page.getByRole('option', { name: 'Lora', exact: true }).tap();
    await page.setViewportSize({ width: 844, height: 390 });
    await heading.tap();
    await page.getByRole('option', { name: 'Inter', exact: true }).tap();
    await page.getByRole('button', { name: 'Copy UI CSS', exact: true }).tap();
    await expect(page.locator('.ui-guide-message')).toContainText('Copy was blocked');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await context.close();
  });
}
