import { test, expect } from '@playwright/test';

test('Server root responds with status 200', async ({ request }) => {
  const res = await request.get('/');
  expect(res.status()).toBe(200);
  const text = await res.text();
  expect(text).toContain('Сервер работает') // text from root route
});
