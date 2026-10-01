import { test, expect, type Page } from '@playwright/test';

type Stream = {
  url: string;
  closed: boolean;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
};
type TestWindow = Window & { __streams: Stream[] };

async function mockStream(page: Page) {
  await page.addInitScript(() => {
    const streams: Stream[] = [];
    Object.assign(window, { __streams: streams });
    class MockEventSource {
      url: string;
      closed = false;
      onmessage: Stream['onmessage'] = null;
      onerror: Stream['onerror'] = null;
      constructor(url: string) { this.url = url; streams.push(this); }
      close() { this.closed = true; }
    }
    Object.defineProperty(window, 'EventSource', { value: MockEventSource });
  });
}
async function publish(page: Page, data: unknown) {
  await page.evaluate((message) => {
    const streams = (window as TestWindow).__streams;
    const current = streams.findLast((stream) => !stream.closed);
    current?.onmessage?.({ data: JSON.stringify(message) });
  }, data);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockStream(page);
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
  await page.route('https://abacus.jasoncameron.dev/**', (route) => route.fulfill({ json: { value: 10 } }));
});

test('a poke updates another open page through server events', async ({ page, context }) => {
  const other = await context.newPage();
  await mockStream(other);
  await other.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
  await other.route('https://abacus.jasoncameron.dev/**', (route) => route.fulfill({ json: { value: 10 } }));
  await page.route('**/hit/roulette-ni-snowi/pokes', (route) => route.fulfill({ json: { value: 11 } }));
  await Promise.all([page.goto('/'), other.goto('/')]);
  await expect(other.getByRole('button', { name: 'Poke Snowi: 10' })).toBeVisible();
  await page.getByRole('button', { name: 'Poke Snowi: 10' }).click();
  await expect(page.getByRole('button', { name: 'Poke Snowi: 11' })).toBeEnabled();
  // Model the service broadcasting the confirmed increment to both subscribers.
  await Promise.all([publish(page, { value: 11 }), publish(other, { value: 11 })]);
  await expect(other.getByRole('button', { name: 'Poke Snowi: 11' })).toBeVisible();
  await publish(other, { value: 9 });
  await publish(other, { value: 'invalid' });
  await expect(other.getByRole('button', { name: 'Poke Snowi: 11' })).toBeVisible();
});

test('stream errors use refresh fallback and valid events stop polling', async ({ page }) => {
  await page.clock.install();
  let reads = 0;
  await page.route('**/get/roulette-ni-snowi/pokes', (route) => {
    reads += 1;
    return route.fulfill({ json: { value: reads === 1 ? 10 : 25 } });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Poke Snowi: 10' })).toBeVisible();
  await publish(page, { value: 15 });
  await page.clock.fastForward(12_000);
  expect(reads).toBe(1);
  await page.evaluate(() => (window as TestWindow).__streams.findLast((stream) => !stream.closed)?.onerror?.());
  await page.clock.fastForward(10_000);
  await expect(page.getByRole('button', { name: 'Poke Snowi: 25' })).toBeVisible();
  await publish(page, { value: 30 });
  const count = reads;
  await page.clock.fastForward(30_000);
  expect(reads).toBe(count);
  await expect(page.getByRole('button', { name: 'Poke Snowi: 30' })).toBeVisible();
});

test('hidden tabs close the stream and reconnect on returning', async ({ page }) => {
  await page.clock.install();
  let reads = 0;
  await page.route('**/get/roulette-ni-snowi/pokes', (route) => {
    reads += 1;
    return route.fulfill({ json: { value: 10 } });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Poke Snowi: 10' })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.evaluate(() => (window as TestWindow).__streams.every((stream) => stream.closed))).toBe(true);
  const count = reads;
  await page.clock.fastForward(60_000);
  expect(reads).toBe(count);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await publish(page, { value: 35 });
  await expect(page.getByRole('button', { name: 'Poke Snowi: 35' })).toBeVisible();
  expect(await page.evaluate(() => (window as TestWindow).__streams.filter((stream) => !stream.closed).length)).toBe(1);
});

test('unsupported streaming falls back to reads', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => Object.defineProperty(window, 'EventSource', { value: undefined }));
  let reads = 0;
  await page.route('**/get/roulette-ni-snowi/pokes', (route) => {
    reads += 1;
    return route.fulfill({ json: { value: reads === 1 ? 10 : 20 } });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Poke Snowi: 10' })).toBeVisible();
  await page.clock.fastForward(10_000);
  await expect(page.getByRole('button', { name: 'Poke Snowi: 20' })).toBeVisible();
});

test('failed pokes do not invent count increments and a pending read does not drop a poke', async ({ page }) => {
  let release: (() => void) | undefined;
  await page.route('**/get/roulette-ni-snowi/pokes', async (route) => {
    await new Promise<void>((resolve) => { release = resolve; });
    await route.fulfill({ json: { value: 10 } });
  });
  await page.route('**/hit/roulette-ni-snowi/pokes', (route) => route.fulfill({ json: { value: 11 } }));
  await page.goto('/');
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByRole('button', { name: /Poke Snowi/ }).click();
  await expect(page.getByRole('button', { name: 'Poke Snowi: 11' })).toBeEnabled();
  release!();
  await page.route('**/hit/roulette-ni-snowi/pokes', (route) => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Poke Snowi: 11' }).click();
  await expect(page.getByText('counter offline')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Poke Snowi: 11' })).toBeEnabled();
});
