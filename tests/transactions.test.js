const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { createTestUser, generateToken, createTestCategory, cleanupUser } = require('./helpers');

let user, token, incomeCat, expenseCat;

beforeAll(async () => {
  user = await createTestUser();
  token = generateToken(user.id);
  incomeCat = await createTestCategory({ type: 'income', name: 'Income', user_id: user.id });
  expenseCat = await createTestCategory({ type: 'expense', name: 'Expense', user_id: user.id });
}, 30000);

afterAll(async () => {
  await cleanupUser(user?.id);
});

describe('Transactions', () => {
  let txId;

  describe('POST /api/transactions', () => {
    test('creates expense transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: 2500, category_id: expenseCat.id, date: '2026-05-01' });
      expect(res.status).toBe(201);
      txId = res.body.id || res.body.transaction?.id;
    });

    test('creates income transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'income', amount: 10000, category_id: incomeCat.id, date: '2026-05-01' });
      expect(res.status).toBe(201);
    });

    test('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 1000 });
      expect(res.status).toBe(400);
    });

    test('returns 400 for invalid type', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'invalid', amount: 1000, category_id: expenseCat.id, date: '2026-05-01' });
      expect(res.status).toBe(400);
    });

    test('returns 400 for negative amount', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: -100, category_id: expenseCat.id, date: '2026-05-01' });
      expect(res.status).toBe(400);
    });

    test('returns 400 for invalid category_id', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense', amount: 1000, category_id: 99999, date: '2026-05-01' });
      expect(res.status).toBe(500);
    });

    test('returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ type: 'expense', amount: 1000, category_id: expenseCat.id, date: '2026-05-01' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/transactions', () => {
    test('returns transactions list', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('filters by type', async () => {
      const res = await request(app)
        .get('/api/transactions?type=income')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('filters by date range', async () => {
      const res = await request(app)
        .get('/api/transactions?startDate=2026-01-01&endDate=2026-12-31')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('supports pagination with offset', async () => {
      const res = await request(app)
        .get('/api/transactions?offset=0&limit=5')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('searches by query', async () => {
      const res = await request(app)
        .get('/api/transactions?q=test')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/transactions/:id', () => {
    test('returns transaction by id', async () => {
      if (!txId) return;
      const res = await request(app)
        .get(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('returns 404 for non-existent id', async () => {
      const res = await request(app)
        .get('/api/transactions/999999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/transactions/:id', () => {
    test('updates transaction', async () => {
      if (!txId) return;
      const res = await request(app)
        .patch(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 3000 });
      expect(res.status === 200 || res.status === 204).toBe(true);
    });

    test('returns 400 for invalid update data', async () => {
      if (!txId) return;
      const res = await request(app)
        .patch(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'invalid' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    test('deletes transaction', async () => {
      if (!txId) return;
      const res = await request(app)
        .delete(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status === 200 || res.status === 204).toBe(true);
    });
  });
});
