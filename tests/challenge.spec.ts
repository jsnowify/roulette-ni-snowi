import { test, expect } from '@playwright/test';
import { BUILD_PLAN, CHALLENGE_KEY, WEEK_MS, isChallenge } from '../src/lib/challenge';
import { mockCounter } from './support';

test.beforeEach(async ({ context }) => {
  await context.route('https://abacus.jasoncameron.dev/**', mockCounter);
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
});

test('reload during animation keeps the original draw, including its mood', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Extra reels/ }).click();
  await page.locator('.spin').click();
  const drawn = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), CHALLENGE_KEY);
  expect(drawn.brief.mood).toBeTruthy();
  await page.reload();
  await expect(page.locator('.brief')).toContainText(drawn.brief.brand);
  await expect(page.locator('.brief')).toContainText(drawn.brief.mood);
  await expect(page.locator('.spin')).toBeDisabled();
  await page.goto('/?brand=Hoshi&category=Luxury');
  await expect(page.locator('.brief')).toContainText(drawn.brief.brand);
  expect(new URL(page.url()).searchParams.get('mood')).toBe(drawn.brief.mood);
});

test('a second tab follows the draw, acceptance, progress, and next challenge', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const other = await context.newPage();
  await other.emulateMedia({ reducedMotion: 'reduce' });
  await other.goto('/');
  await page.bringToFront();
  await page.locator('.spin').click();
  await expect(page.locator('.brief')).toBeVisible();
  const brand = await page.locator('.brief > strong').innerText();
  await expect(other.locator('.brief')).toContainText(brand);
  await expect(other.locator('.band .item').nth(1)).toHaveText(brand);
  await expect(other.locator('.spin')).toBeDisabled();
  await page.getByRole('button', { name: /^Accept challenge/ }).click();
  await expect(other.locator('.build-plan')).toBeVisible();
  await expect(other.locator('.saved li')).toHaveCount(1);
  await other.bringToFront();
  await other.locator('.milestones input').first().check();
  await expect(page.locator('.milestones input').first()).toBeChecked();
  await page.bringToFront();
  for (const checkbox of await page.locator('.milestones input').all()) await checkbox.check();
  await expect(other.locator('.plan-status')).toContainText('7 of 7');
  await other.bringToFront();
  await other.getByRole('button', { name: /^Finish challenge/ }).click();
  await expect(page.locator('.plan-status')).toContainText('Challenge complete');
  await expect(page.locator('.saved input')).toBeChecked();
  await page.bringToFront();
  await page.getByRole('button', { name: /^Start your next challenge/ }).click();
  await expect(other.locator('.brief')).toHaveCount(0);
  await expect(other.locator('.spin')).toBeEnabled();
  expect(new URL(other.url()).search).toBe('');
  // Reusing the second tab's existing reels must still animate a new draw.
  await other.bringToFront();
  await other.locator('.spin').click();
  await expect(other.locator('.brief')).toBeVisible();
  await expect(page.locator('.brief')).toBeVisible();
});

test('overdue challenges retain the brief, deadline, and progress', async ({ page }) => {
  await page.addInitScript(({ key, week }) => {
    const acceptedAt = Date.now() - week - 60_000;
    localStorage.setItem(key, JSON.stringify({ brief: { brand: 'Hoshi', category: 'Luxury', mood: null }, drawnAt: acceptedAt - 1000, acceptedAt, finishedAt: null, completed: [true, false, false, false, false, false, false] }));
  }, { key: CHALLENGE_KEY, week: WEEK_MS });
  await page.goto('/');
  await expect(page.locator('.plan-status')).toContainText('Your week is up');
  await expect(page.locator('.brief')).toContainText('Hoshi');
  await expect(page.locator('.milestones input').first()).toBeChecked();
  await expect(page.locator('.spin')).toBeDisabled();
  await expect(page.getByRole('button', { name: /^Finish challenge/ })).toBeDisabled();
});

test('acceptance persists even when the saved archive is full', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('roulette-ni-snowi:saved:v2', JSON.stringify(Array.from({ length: 200 }, (_, i) => ({ id: String(i), brand: `Archived ${i}`, category: 'Luxury', mood: null, done: false, savedAt: 1 }))));
  });
  await page.goto('/');
  await page.locator('.spin').click();
  await page.getByRole('button', { name: /^Accept challenge/ }).click();
  await page.locator('.milestones input').first().check();
  await page.reload();
  await expect(page.locator('.milestones input').first()).toBeChecked();
  await expect(page.locator('.saved li')).toHaveCount(200);
  await expect(page.locator('.spin')).toBeDisabled();
});

test('stored challenge validation rejects invalid dates and forged completed states', () => {
  const valid = { brief: { brand: 'Hoshi', category: 'Luxury', mood: null }, drawnAt: 1000, acceptedAt: 2000, finishedAt: null, completed: BUILD_PLAN.map(() => false) };
  expect(isChallenge(null)).toBe(true);
  expect(isChallenge(valid)).toBe(true);
  for (const bad of [
    { ...valid, acceptedAt: Infinity },
    { ...valid, drawnAt: 9e15 },
    { ...valid, acceptedAt: 500 },
    { ...valid, completed: [true] },
    { ...valid, finishedAt: 3000 },
    { ...valid, brief: { ...valid.brief, brand: ' ' } },
    { ...valid, brief: { ...valid.brief, mood: {} } },
  ]) expect(isChallenge(bad)).toBe(false);
});
