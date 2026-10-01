import { test, expect, type Page } from '@playwright/test';

const spin = (page: Page) => page.getByRole('button', { name: /^Spin/ });
async function finishSpin(page: Page) {
  await spin(page).click();
  await expect(spin(page)).toBeEnabled();
  await expect(page.locator('.brief')).toBeVisible();
}
async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => Array.from(document.querySelectorAll('body *'))
    .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
    .map((el) => `${el.tagName}.${el.className}`));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), overflow.join(', ')).toBe(true);
}

test.beforeEach(async ({ page }) => {
  // No tests send real hits to the shared counter or depend on third-party fonts.
  await page.route('https://abacus.jasoncameron.dev/**', (route) => route.fulfill({ json: { value: 101 } }));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('spin, lock, extra reels, history, save and reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.brief')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lock Brand', exact: true })).toBeDisabled();
  await finishSpin(page);
  const brand = new URL(page.url()).searchParams.get('brand');
  await page.getByRole('button', { name: 'Lock Brand', exact: true }).click();
  await finishSpin(page);
  expect(new URL(page.url()).searchParams.get('brand')).toBe(brand);
  await page.getByRole('button', { name: 'Lock Category', exact: true }).click();
  await expect(page.getByRole('button', { name: /Unlock a reel/ })).toBeDisabled();
  await page.getByRole('button', { name: "Today's brief" }).click();
  await expect(spin(page)).toBeEnabled();
  await page.getByRole('button', { name: /Extra reels/ }).click();
  await finishSpin(page);
  await expect(page.locator('.brief')).toContainText('Mood:');
  await page.getByRole('button', { name: 'Save brief', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.reload();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await expect(page.getByRole('button', { name: /Extra reels/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Remove saved brief/ }).click();
  await expect(page.locator('.saved')).toHaveCount(0);
});

for (const width of [280, 320, 375, 390, 540, 720, 768, 960, 1280]) {
  test(`responsive layout at ${width}px with long custom content`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => {
      const long = 'W'.repeat(40);
      localStorage.setItem('roulette-ni-snowi:custom:v1', JSON.stringify({ brand: [long], category: [long], mood: [long] }));
    });
    const long = 'W'.repeat(40);
    await page.goto(`/?brand=${long}&category=${long}&mood=${long}`);
    await page.getByText('Add your own entries', { exact: false }).click();
    await page.getByRole('button', { name: 'Save brief', exact: true }).click();
    await expect(page.locator('.brief')).toContainText(long);
    await noOverflow(page);
    for (const item of await page.locator('.band .item').all()) {
      const dimensions = await item.evaluate((el) => ({ text: el.textContent, width: el.clientWidth, scrollWidth: el.scrollWidth, height: el.clientHeight, scrollHeight: el.scrollHeight }));
      expect(dimensions.scrollHeight <= dimensions.height && dimensions.scrollWidth <= dimensions.width, JSON.stringify(dimensions)).toBe(true);
    }
    await page.screenshot({ path: `test-results/layout-${width}-${test.info().project.name}.png`, fullPage: true });
  });
}

test('unavailable storage and clipboard still allow spinning and manual copy', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Blocked'); } });
    Object.defineProperty(navigator, 'clipboard', { value: undefined });
    document.execCommand = () => false;
  });
  await page.goto('/');
  await finishSpin(page);
  await page.getByRole('button', { name: 'Copy brief', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Text to copy' })).toContainText('Build');
  await page.getByRole('button', { name: 'Save brief', exact: true }).click();
  await expect(page.locator('.saved li')).toHaveCount(1);
});

test('legacy clipboard succeeds when modern clipboard rejects', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Denied')) } });
    document.execCommand = () => true;
  });
  await page.goto('/');
  await finishSpin(page);
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Link copied', exact: true })).toBeVisible();
  await expect(page.locator('.copy-fallback textarea, body > textarea')).toHaveCount(0);
});

test('corrupt storage and invalid URL values recover', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('roulette-ni-snowi:saved:v2', '{bad JSON');
    localStorage.setItem('roulette-ni-snowi:extras', '"false"');
    localStorage.setItem('roulette-ni-snowi:custom:v1', JSON.stringify({ brand: ['   '], category: [], mood: [] }));
  });
  await page.goto('/?brand=invalid&category=invalid');
  await expect(page.locator('.brief')).toHaveCount(0);
  await finishSpin(page);
  expect(errors).toEqual([]);
});

test('custom duplicate validation, removal, and shared result survive reload', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Add your own entries', { exact: false }).click();
  await page.getByLabel('New entry').fill('  CustomBrand  ');
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  await expect(page.locator('.custom-list')).toContainText('CustomBrand');
  await page.getByLabel('New entry').fill('custombrand');
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  await expect(page.locator('.msg')).toContainText('already');
  await finishSpin(page);
  const category = new URL(page.url()).searchParams.get('category');
  await page.goto(`/?brand=CustomBrand&category=${encodeURIComponent(category!)}`);
  await expect(page.locator('.brief')).toContainText('CustomBrand');
  await page.getByText('Add your own entries', { exact: false }).click();
  await page.getByRole('button', { name: 'Remove CustomBrand from Brand', exact: true }).click();
  await expect(page.locator('.brief')).toContainText('CustomBrand');
  await finishSpin(page);
  await expect(page.locator('.brief')).not.toContainText('CustomBrand');
});

test('safety timeout completes spins without transition events', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.addStyleTag({ content: '.strip { transition: none !important; }' });
  await finishSpin(page);
  await expect(page.locator('.reel[data-run="true"]')).toHaveCount(0);
});

test('backgrounding completes spins and prevents late animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await spin(page).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(spin(page)).toBeEnabled();
  await expect(page.locator('.brief')).toBeVisible();
  await expect(page.locator('.reel[data-run="true"]')).toHaveCount(0);
});

test('audio is lazy, cached, muteable, and optional when files fail', async ({ page }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/sounds/')) requests.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await finishSpin(page);
  expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: /Sound/ }).click();
  await expect.poll(() => requests.length).toBe(4);
  await finishSpin(page);
  await finishSpin(page);
  expect(requests).toHaveLength(4);
  await page.getByRole('button', { name: /Sound/ }).click();
  await expect(page.getByRole('button', { name: /Sound/ })).toHaveAttribute('aria-pressed', 'false');
  await finishSpin(page);
  await page.reload();
  await page.route('**/sounds/**', (route) => route.abort());
  await page.getByRole('button', { name: /Sound/ }).click();
  await finishSpin(page);
  expect(errors).toEqual([]);
});

test('repeated keyboard spins cap history and do not trigger in input fields', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 10; i++) {
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('Space');
    await expect(spin(page)).toBeEnabled();
    await expect(page.getByRole('status').first()).toContainText(`spins: ${String(i + 1).padStart(3, '0')}`);
  }
  await expect(page.locator('.history li')).toHaveCount(7);
  await page.getByText('Add your own entries', { exact: false }).click();
  await page.getByLabel('New entry').focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('status').first()).toContainText('spins: 010');
});

test('normal motion lands on selected values and daily picks are repeatable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: /Extra reels/ }).click();
  await finishSpin(page);
  const query = new URL(page.url()).searchParams;
  for (const [i, key] of ['brand', 'category', 'mood'].entries()) {
    await expect(page.locator('.reel').nth(i).locator('.band .item').nth(1)).toHaveText(query.get(key)!);
  }
  await page.getByRole('button', { name: "Today's brief" }).click();
  await expect(spin(page)).toBeEnabled();
  const daily = page.url();
  await page.getByRole('button', { name: "Today's brief" }).click();
  await expect(spin(page)).toBeEnabled();
  expect(page.url()).toBe(daily);
});

test('saved list handles duplicate IDs and enforces its 200-item limit', async ({ page }) => {
  await page.addInitScript(() => {
    const briefs = Array.from({ length: 200 }, (_, i) => ({ id: 'duplicate-id', brand: `Brand${i}`, category: 'Portfolio', mood: null, done: false, savedAt: 1 }));
    localStorage.setItem('roulette-ni-snowi:saved:v2', JSON.stringify(briefs));
  });
  await page.goto('/');
  await finishSpin(page);
  await expect(page.getByRole('button', { name: 'Saved list full' })).toBeDisabled();
  await expect(page.locator('.saved li')).toHaveCount(200);
  await page.getByRole('button', { name: 'Remove saved brief for Brand0', exact: true }).click();
  await expect(page.locator('.saved li')).toHaveCount(199);
  await page.getByRole('button', { name: 'Save brief', exact: true }).click();
  await expect(page.locator('.saved li')).toHaveCount(200);
});

test('audio reuses one context and mute stops active playback', async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { contexts: 0, starts: 0, stops: 0 };
    Object.assign(window, { __audioMetrics: metrics });
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor() { super(); metrics.contexts += 1; }
      createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source);
        const stop = source.stop.bind(source);
        source.start = (...args: Parameters<typeof start>) => { metrics.starts += 1; start(...args); };
        source.stop = (...args: Parameters<typeof stop>) => { metrics.stops += 1; stop(...args); };
        return source;
      }
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Sound/ }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __audioMetrics: { starts: number } }).__audioMetrics.starts)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await spin(page).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __audioMetrics: { starts: number } }).__audioMetrics.starts)).toBeGreaterThan(1);
  await page.getByRole('button', { name: /Sound/ }).click();
  expect(await page.evaluate(() => (window as Window & { __audioMetrics: { stops: number } }).__audioMetrics.stops)).toBeGreaterThan(0);
  await expect(spin(page)).toBeEnabled();
  await page.getByRole('button', { name: /Sound/ }).click();
  await finishSpin(page);
  expect(await page.evaluate(() => (window as Window & { __audioMetrics: { contexts: number } }).__audioMetrics.contexts)).toBe(1);
});

test('touch webview emulation supports portrait, landscape, and unavailable audio', async ({ browser, browserName }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: browserName !== 'firefox', hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 [FBAN/Orca-Android]',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://abacus.jasoncameron.dev/**', (route) => route.abort());
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: undefined });
    Object.defineProperty(window, 'webkitAudioContext', { value: undefined });
  });
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button', { name: /Sound/ }).tap();
  await finishSpin(page);
  await noOverflow(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: /Extra reels/ }).tap();
  await finishSpin(page);
  await noOverflow(page);
  expect(errors).toEqual([]);
  await context.close();
});
