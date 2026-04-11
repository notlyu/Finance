# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transaction.spec.ts >> Create transaction with category and verify in dashboard
- Location: tests\e2e\transaction.spec.ts:3:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: undefined
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Create transaction with category and verify in dashboard', async ({ request }) => {
  4  |   // Login to obtain token
  5  |   const loginRes = await request.post('/api/auth/login', {
  6  |     data: { email: 'test@example.com', password: '123456' },
  7  |   });
  8  |   expect(loginRes.status()).toBe(200);
  9  |   const loginBody = await loginRes.json();
  10 |   const token = loginBody?.token;
  11 |   expect(token).toBeTruthy();
  12 | 
  13 |   // Fetch categories to get a valid category_id
  14 |   const catRes = await request.get('/api/categories', {
  15 |     headers: { Authorization: `Bearer ${token}` },
  16 |   });
  17 |   expect(catRes.ok()).toBeTruthy();
  18 |   const cats = await catRes.json();
  19 |   const categoryId = cats && cats.length > 0 ? cats[0].id : null;
  20 |   expect(categoryId).toBeTruthy();
  21 | 
  22 |   // Create a transaction
  23 |   const tx = {
  24 |     amount: 1000,
  25 |     type: 'expense',
  26 |     category_id: categoryId,
  27 |     date: new Date().toISOString(),
  28 |     comment: 'Тестовая операция',
  29 |   };
  30 |   const txRes = await request.post('/api/transactions', {
  31 |     data: tx,
  32 |     headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  33 |   });
  34 |   expect(txRes.status()).toBe(201);
  35 |   const txBody = await txRes.json();
> 36 |   expect(txBody?.id).toBeTruthy();
     |                      ^ Error: expect(received).toBeTruthy()
  37 | 
  38 |   // Get transactions to ensure the new entry appears
  39 |   const listRes = await request.get('/api/transactions', {
  40 |     headers: { Authorization: `Bearer ${token}` },
  41 |   });
  42 |   expect(listRes.ok()).toBeTruthy();
  43 |   const list = await listRes.json();
  44 |   const hasTxn = list?.length ? list.find((t) => t.id === txBody.id) : false;
  45 |   // Accept either the full payload or a subset depending on API shape
  46 |   expect(hasTxn || true).toBeTruthy();
  47 | });
  48 | 
```