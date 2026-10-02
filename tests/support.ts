import type { Route } from '@playwright/test';

// Match the service's response type so WebKit does not report a false page error.
export function mockCounter(route: Route) {
  return route.request().url().includes('/stream/')
    ? route.fulfill({ contentType: 'text/event-stream', body: 'data: {"value":101}\n\n' })
    : route.fulfill({ json: { value: 101 } });
}
