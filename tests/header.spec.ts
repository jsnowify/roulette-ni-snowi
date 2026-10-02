import { mockCounter } from './support';
import { test, expect } from '@playwright/test';

for (const width of [320, 768, 1280]) {
test(`header roller stays within ${width}px and keeps its eye on the cursor`, async ({ page }) => {
  await page.setViewportSize({ width, height: 800 });
  await page.route('https://abacus.jasoncameron.dev/**', mockCounter);
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  // Sample the full outward journey, including its rightmost endpoint.
  for (let i = 0; i < 20; i++) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await page.evaluate(() => ({
      ball: document.querySelector('.roller-ball')!.getBoundingClientRect().toJSON(),
      header: document.querySelector('.top')!.getBoundingClientRect().toJSON(),
    }));
    expect(bounds.ball.left).toBeGreaterThanOrEqual(bounds.header.left);
    expect(bounds.ball.right).toBeLessThanOrEqual(bounds.header.right);
    await page.waitForTimeout(500);
  }
  await page.locator('.logo').hover();
  await expect(page.locator('.roller')).toHaveClass(/is-flat/);
  await expect.poll(() => page.locator('.roller-squash').evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(1.1);
  const baseline = await page.evaluate(() => ({
    ball: document.querySelector('.roller-squash')!.getBoundingClientRect().bottom,
    header: document.querySelector('.top')!.getBoundingClientRect().bottom,
  }));
  expect(Math.abs(baseline.ball - baseline.header)).toBeLessThan(0.1);
  await expect(page.locator('.eye')).toHaveCount(1);
  await expect(page.locator('.eye-lid')).toHaveCSS('border-bottom-width', '0px');
  // Sample the spring opening, not just the hidden/settled states.
  const peekBounds = await page.evaluate(async () => {
    const results = [];
    for (let i = 0; i < 12; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const eye = document.querySelector('.eye');
      if (eye) results.push({
        eye: eye.getBoundingClientRect().toJSON(),
        header: document.querySelector('.top')!.getBoundingClientRect().toJSON(),
        scrollWidth: document.documentElement.scrollWidth,
        width: innerWidth,
      });
    }
    return results;
  });
  expect(peekBounds.length).toBeGreaterThan(0);
  for (const frame of peekBounds) {
    expect(frame.scrollWidth).toBeLessThanOrEqual(frame.width);
    expect(frame.eye.left).toBeGreaterThanOrEqual(frame.header.left);
    expect(frame.eye.right).toBeLessThanOrEqual(frame.header.right);
    expect(Math.abs(frame.eye.bottom - frame.header.bottom)).toBeLessThan(0.1);
  }
  await page.locator('.top').screenshot({ path: `test-results/header-${width}-${test.info().project.name}.png` });
  await page.waitForTimeout(1000);
  await expect(page.locator('.eye')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const headerBox = (await page.locator('.top').boundingBox())!;
  const pointerY = headerBox.y + headerBox.height / 2;
  await page.mouse.move(headerBox.x + headerBox.width - 4, pointerY);
  await page.waitForTimeout(250);
  const right = await page.locator('.eye-pupil').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
  await page.mouse.move(headerBox.x + 4, pointerY);
  await expect.poll(() => page.locator('.eye-pupil').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBeLessThan(right);
  await page.mouse.move(0, 400);
  await expect(page.locator('.eye')).toHaveCount(0);
  await expect(page.locator('.roller')).not.toHaveClass(/is-flat/);
  await expect.poll(() => page.locator('.roller-squash').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(13);
  const pausedPosition = await page.locator('.roller-track').evaluate(el => getComputedStyle(el).transform);
  await expect.poll(() => page.locator('.roller-track').evaluate(el => getComputedStyle(el).transform)).not.toBe(pausedPosition);
  await page.locator('.logo').hover();
  await expect(page.locator('.eye')).toHaveCount(1);
  await page.mouse.move(0, 400);
  await expect(page.locator('.eye')).toHaveCount(0);
  await page.setViewportSize({ width: 280, height: 800 });
  await expect.poll(() => page.evaluate(() => {
    const ball = document.querySelector('.roller-ball')!.getBoundingClientRect();
    const header = document.querySelector('.top')!.getBoundingClientRect();
    return ball.left >= header.left && ball.right <= header.right && document.documentElement.scrollWidth <= innerWidth;
  })).toBe(true);
});
}

test('reduced motion removes the decorative roller', async ({ page }) => {
  await page.route('https://abacus.jasoncameron.dev/**', mockCounter);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.roller')).toHaveCount(0);
  await page.locator('.logo').hover();
  await expect(page.locator('.eye')).toHaveCount(0);
});
