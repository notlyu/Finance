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

describe('Recurring Transactions', () => {
  let recurringId;

  describe('POST /api/recurring', () => {
    test('creates recurring transaction', async () => {
      const res = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'expense',
          amount: 5000,
          category_id: cat.id,
          day_of_month: 15,
          start_month: '2026-05',
          comment: 'Monthly rent',
        });
      expect(res.status).toBe(201);
      recurringId = res.body.id;
    });

    test('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense' });
      expect(res.status).toBe(400);
    });

    test('returns 400 for invalid day_of_month', async () => {
      const res = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'expense', amount: 1000, category_id: cat.id,
          day_of_month: 32, start_month: '2026-05',
        });
      expect(res.status).toBe(400);
    });

    test('returns 400 for negative amount', async () => {
      const res = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'expense', amount: -100, category_id: cat.id,
          day_of_month: 1, start_month: '2026-05',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/recurring', () => {
    test('returns recurring list', async () => {
      const res = await request(app)
        .get('/api/recurring')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    });
  });

  describe('PATCH /api/recurring/:id', () => {
    test('toggles active status', async () => {
      if (!recurringId) return;
      const res = await request(app)
        .patch(`/api/recurring/${recurringId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ active: false });
      expect(res.status === 200 || res.status === 204).toBe(true);
    });

    test('returns 400 for invalid update', async () => {
      if (!recurringId) return;
      const res = await request(app)
        .patch(`/api/recurring/${recurringId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ day_of_month: 35 });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/recurring/:id', () => {
    test('deletes recurring transaction', async () => {
      if (!recurringId) return;
      const res = await request(app)
        .delete(`/api/recurring/${recurringId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status === 200 || res.status === 204).toBe(true);
    });
  });
});
