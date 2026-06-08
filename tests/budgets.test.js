const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { createTestUser, generateToken, createTestCategory, cleanupUser } = require('./helpers');

let user, token, cat;

beforeAll(async () => {
  user = await createTestUser();
  token = generateToken(user.id);
  cat = await createTestCategory({ user_id: user.id });
}, 30000);

afterAll(async () => {
  await cleanupUser(user?.id);
});

describe('Budgets', () => {
  let budgetId;

  describe('POST /api/budgets', () => {
    test('creates budget for current month', async () => {
      const month = new Date().toISOString().slice(0, 7);
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${token}`)
        .send({ month, category_id: cat.id, limit_amount: 10000 });
      expect(res.status).toBe(201);
      budgetId = res.body.id || res.body.budget?.id;
    });

    test('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${token}`)
        .send({ month: '2026-05' });
      expect(res.status).toBe(400);
    });

    test('returns 400 for negative limit', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${token}`)
        .send({ month: '2026-05', category_id: cat.id, limit_amount: -100 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/budgets', () => {
    test('returns budgets list', async () => {
      const res = await request(app)
        .get('/api/budgets')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    test('filters by month', async () => {
      const month = new Date().toISOString().slice(0, 7);
      const res = await request(app)
        .get(`/api/budgets?month=${month}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/budgets/:id', () => {
    test('updates budget limit', async () => {
      if (!budgetId) return;
      const res = await request(app)
        .patch(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ limit_amount: 15000 });
      expect(res.status === 200 || res.status === 204).toBe(true);
    });

    test('returns 400 for invalid limit', async () => {
      if (!budgetId) return;
      const res = await request(app)
        .patch(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ limit_amount: -100 });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/budgets/:id', () => {
    test('deletes budget', async () => {
      if (!budgetId) return;
      const res = await request(app)
        .delete(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status === 200 || res.status === 204).toBe(true);
    });

    test('returns 404 for non-existent budget', async () => {
      const res = await request(app)
        .delete('/api/budgets/999999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
