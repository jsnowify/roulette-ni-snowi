import { mockCounter } from './support';
import { test, expect } from '@playwright/test';

test('wheel scrolling eases to its target and follows reduced motion changes', async ({ page }) => {
  await page.route('https://abacus.jasoncameron.dev/**', mockCounter);
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.setViewportSize({ width: 1000, height: 400 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/lenis/);
  const scroll = await page.evaluate(async () => {
    const event = new WheelEvent('wheel', { deltaY: 300, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    const start = scrollY;
    await new Promise(resolve => setTimeout(resolve, 100));
    return { intercepted: event.defaultPrevented, start, during: scrollY };
  });
  expect(scroll.intercepted).toBe(true);
  expect(scroll.start).toBe(0);
  expect(scroll.during).toBeGreaterThan(0);
  expect(scroll.during).toBeLessThan(300);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(300);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveClass(/lenis/);
});
