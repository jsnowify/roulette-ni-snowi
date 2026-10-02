import { mockCounter } from './support';
import { test, expect, type Page } from '@playwright/test';

const spin = (page: Page) => page.locator('.spin');
async function finishSpin(page: Page) {
  await spin(page).click();
  await expect(page.locator('.brief')).toBeVisible();
  await expect(spin(page)).toBeDisabled();
}
async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => Array.from(document.querySelectorAll('body *'))
    .filter(el => el.getBoundingClientRect().right > innerWidth + 1)
    .map(el => `${el.tagName}.${el.className}`));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), overflow.join(', ')).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.route('https://abacus.jasoncameron.dev/**', mockCounter);
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('one draw, acceptance, weekly progress, finish, and next challenge survive reloads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.brief')).toHaveCount(0);
  await page.getByRole('button', { name: /Extra reels/ }).click();
  await finishSpin(page);
  const assigned = page.url();
  await expect(page.locator('.brief')).toContainText('Mood:');
  await expect(page.getByRole('button', { name: "Today's challenge" })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Extra reels/ })).toBeDisabled();
  await page.reload();
  expect(page.url()).toBe(assigned);
  await expect(spin(page)).toBeDisabled();
  await page.getByRole('button', { name: /^Accept challenge/ }).click();
  await expect(page.locator('#plan-title')).toBeFocused();
  await expect(page.locator('.plan-status')).toContainText('7 days remaining');
  await expect(page.locator('.saved li')).toHaveCount(1);
  const checklist = page.locator('.milestones input');
  await checklist.nth(0).check();
  await page.reload();
  await expect(checklist.nth(0)).toBeChecked();
  await expect(page.getByRole('button', { name: /^Finish challenge/ })).toBeDisabled();
  for (const checkbox of await checklist.all()) await checkbox.check();
  await page.getByRole('button', { name: /^Finish challenge/ }).click();
  await expect(page.locator('.plan-status')).toContainText('Challenge complete');
  await expect(page.locator('.saved input')).toBeChecked();
  await page.reload();
  await expect(page.locator('.plan-status')).toContainText('Challenge complete');
  await page.getByRole('button', { name: /^Start your next challenge/ }).click();
  await expect(spin(page)).toBeEnabled();
  await expect(spin(page)).toBeFocused();
  expect(new URL(page.url()).search).toBe('');
  await expect(page.locator('.brief')).toHaveCount(0);
  await finishSpin(page);
  await expect(page.locator('.history li')).toHaveCount(1);
  await expect(page.locator('.saved li')).toHaveCount(1);
});

for (const width of [280, 320, 375, 390, 540, 720, 768, 960, 1280]) {
  test(`responsive layout at ${width}px with long custom content and a full build plan`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => {
      const long = 'W'.repeat(40);
      localStorage.setItem('roulette-ni-snowi:custom:v1', JSON.stringify({ brand: [long], category: [long], mood: [long] }));
    });
    const long = 'W'.repeat(40);
    await page.goto(`/?brand=${long}&category=${long}&mood=${long}`);
    await page.getByText('Add your own entries', { exact: false }).click();
    await page.getByRole('button', { name: /^Accept challenge/ }).click();
    await expect(page.locator('.brief')).toContainText(long);
    await noOverflow(page);
    for (const item of await page.locator('.band .item').all()) {
      const d = await item.evaluate(el => ({ text: el.textContent, width: el.clientWidth, scrollWidth: el.scrollWidth, height: el.clientHeight, scrollHeight: el.scrollHeight }));
      expect(d.scrollHeight <= d.height && d.scrollWidth <= d.width, JSON.stringify(d)).toBe(true);
    }
    await page.screenshot({ path: `test-results/layout-${width}-${test.info().project.name}.png`, fullPage: true });
  });
}

test('unavailable storage and clipboard still allow the challenge and manual copy', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Blocked'); } });
    Object.defineProperty(navigator, 'clipboard', { value: undefined });
    document.execCommand = () => false;
  });
  await page.goto('/');
  await finishSpin(page);
  await page.getByRole('button', { name: 'Copy brief', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Text to copy' })).toContainText('from scratch in seven days');
  await page.getByRole('button', { name: /^Accept challenge/ }).click();
  await page.locator('.milestones input').first().check();
  await expect(page.locator('.plan-status')).toContainText('1 of 7');
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
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('roulette-ni-snowi:saved:v2', '{bad JSON');
    localStorage.setItem('roulette-ni-snowi:challenge:v1', JSON.stringify({ brief: { brand: 'Hoshi', category: 'Luxury' }, acceptedAt: 'invalid' }));
    localStorage.setItem('roulette-ni-snowi:extras', '"false"');
    localStorage.setItem('roulette-ni-snowi:custom:v1', JSON.stringify({ brand: ['   '], category: [], mood: [] }));
  });
  await page.goto('/?brand=invalid&category=invalid');
  await expect(page.locator('.brief')).toHaveCount(0);
  await finishSpin(page);
  expect(errors).toEqual([]);
});

test('custom validation and removal preserve an accepted custom brand on reload', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Add your own entries', { exact: false }).click();
  await page.getByLabel('New entry').fill('  CustomBrand  ');
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  await expect(page.locator('.custom-list')).toContainText('CustomBrand');
  await page.getByLabel('New entry').fill('custombrand');
  await page.getByRole('button', { name: 'Add entry', exact: true }).click();
  await expect(page.locator('.msg')).toContainText('already');
  await page.goto('/?brand=CustomBrand&category=Luxury');
  await page.getByRole('button', { name: /^Accept challenge/ }).click();
  await page.getByText('Add your own entries', { exact: false }).click();
  await page.getByRole('button', { name: 'Remove CustomBrand from Brand', exact: true }).click();
  await page.reload();
  await expect(page.locator('.brief')).toContainText('CustomBrand');
  await expect(spin(page)).toBeDisabled();
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
  await expect(page.locator('.brief')).toBeVisible();
  await expect(spin(page)).toBeDisabled();
  await expect(page.locator('.reel[data-run="true"]')).toHaveCount(0);
});

test('audio is lazy, cached, muteable, and optional when files fail', async ({ page }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (request.url().includes('/sounds/')) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  expect(requests).toHaveLength(0);
  const audioAvailable = await page.evaluate(() => typeof (window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) === 'function');
  await page.getByRole('button', { name: /Sound/ }).click();
  if (!audioAvailable) {
    await finishSpin(page);
    await expect(page.getByRole('button', { name: /Sound/ })).toHaveAttribute('aria-pressed', 'true');
    expect(requests).toHaveLength(0);
    await page.getByRole('button', { name: /Sound/ }).click();
    await expect(page.getByRole('button', { name: /Sound/ })).toHaveAttribute('aria-pressed', 'false');
    expect(errors).toEqual([]);
    return;
  }
  await expect.poll(() => requests.length).toBe(4);
  await finishSpin(page);
  await page.getByRole('button', { name: /Sound/ }).click();
  await expect(page.getByRole('button', { name: /Sound/ })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: /Sound/ }).click();
  expect(requests).toHaveLength(4);
  await page.reload();
  await page.route('**/sounds/**', route => route.abort());
  await page.getByRole('button', { name: /Sound/ }).click();
  await page.getByRole('button', { name: /Sound/ }).click();
  await page.getByRole('button', { name: /^Accept challenge/ }).click();
  await expect(page.locator('.build-plan')).toBeVisible();
  expect(errors).toEqual([]);
});

test('keyboard spins once and never rerolls or triggers from inputs', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Add your own entries', { exact: false }).click();
  await page.getByLabel('New entry').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.brief')).toHaveCount(0);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('Space');
  await expect(page.locator('.brief')).toBeVisible();
  const assigned = page.url();
  for (let i = 0; i < 5; i++) await page.keyboard.press('Space');
  expect(page.url()).toBe(assigned);
  await expect(page.locator('.history li')).toHaveCount(0);
});

test('normal motion lands on all selected values', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: /Extra reels/ }).click();
  await finishSpin(page);
  const query = new URL(page.url()).searchParams;
  for (const [i, key] of ['brand', 'category', 'mood'].entries()) {
    await expect(page.locator('.reel').nth(i).locator('.band .item').nth(1)).toHaveText(query.get(key)!);
  }
});

test('daily challenge is repeatable in independent browser sessions', async ({ browser }) => {
  const urls: string[] = [];
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.route('https://abacus.jasoncameron.dev/**', mockCounter);
    await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    await page.goto('http://127.0.0.1:4173/');
    await page.getByRole('button', { name: "Today's challenge" }).click();
    await expect(page.locator('.brief')).toBeVisible();
    urls.push(page.url());
    await expect(spin(page)).toBeDisabled();
    await context.close();
  }
  expect(urls[0]).toBe(urls[1]);
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
  await page.getByRole('button', { name: 'Save brief', exact: true }).click();
  await expect(page.locator('.saved li')).toHaveCount(200);
});

test('audio reuses one context and mute stops active playback', async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { contexts: 0, starts: 0, stops: 0 };
    Object.assign(window, { __audioMetrics: metrics });
    const Native = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Native) return;
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
  const audioAvailable = await page.evaluate(() => typeof (window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) === 'function');
  if (!audioAvailable) {
    await page.getByRole('button', { name: /Sound/ }).click();
    await finishSpin(page);
    expect(await page.evaluate(() => (window as Window & { __audioMetrics: { contexts: number } }).__audioMetrics.contexts)).toBe(0);
    return;
  }
  await page.getByRole('button', { name: /Sound/ }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __audioMetrics: { starts: number } }).__audioMetrics.starts)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await spin(page).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __audioMetrics: { starts: number } }).__audioMetrics.starts)).toBeGreaterThan(1);
  await page.getByRole('button', { name: /Sound/ }).click();
  expect(await page.evaluate(() => (window as Window & { __audioMetrics: { stops: number } }).__audioMetrics.stops)).toBeGreaterThan(0);
  await expect(page.locator('.brief')).toBeVisible();
  await page.getByRole('button', { name: /Sound/ }).click();
  expect(await page.evaluate(() => (window as Window & { __audioMetrics: { contexts: number } }).__audioMetrics.contexts)).toBe(1);
});

test('touch webview emulation supports portrait, landscape, and unavailable audio', async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: browserName !== 'firefox', hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://abacus.jasoncameron.dev/**', route => route.abort());
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.addInitScript(() => { Object.defineProperty(window, 'AudioContext', { value: undefined }); });
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button', { name: /Sound/ }).tap();
  await page.getByRole('button', { name: /Extra reels/ }).tap();
  await finishSpin(page);
  await noOverflow(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: /^Accept challenge/ }).tap();
  await noOverflow(page);
  expect(errors).toEqual([]);
  await context.close();
});
