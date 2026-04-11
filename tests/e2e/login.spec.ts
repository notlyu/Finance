import { test, expect } from '@playwright/test';

test('Login via API and access protected route', async ({ request }) => {
  const loginRes = await request.post('/api/auth/login', {
    data: { email: 'test@example.com', password: '123456' },
  });
  expect(loginRes.status()).toBe(200);
  const body = await loginRes.json();
  const token = body?.token;
  expect(token).toBeTruthy();

  const dashRes = await request.get('/api/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(dashRes.ok()).toBeTruthy();
});
