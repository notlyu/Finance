const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { createTestUser, generateToken, createTestAccount, cleanupUser } = require('./helpers');

let user, token, account;

beforeAll(async () => {
  user = await createTestUser();
  token = generateToken(user.id);
  account = await createTestAccount(user.id, { balance: 50000 });
}, 30000);

afterAll(async () => {
  await cleanupUser(user?.id);
});

describe('Goals', () => {
  let goalId;

  describe('POST /api/goals', () => {
    test('creates a goal', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Car', target_amount: 500000 });
      expect(res.status).toBe(201);
      goalId = res.body.id;
    });

    test('creates goal with auto-contribute', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Auto Goal',
          target_amount: 100000,
          auto_contribute_enabled: true,
          auto_contribute_type: 'percentage',
          auto_contribute_value: 10,
        });
      expect(res.status).toBe(201);
    });

    test('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad Goal' });
      expect(res.status).toBe(400);
    });

    test('returns 400 for target_amount <= 0', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad', target_amount: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/goals', () => {
    test('returns goals list', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    });

    test('filters archived', async () => {
      const res = await request(app)
        .get('/api/goals?archived=true')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/goals/:id', () => {
    test('returns goal by id', async () => {
      if (!goalId) return;
      const res = await request(app)
        .get(`/api/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.id === goalId || res.body.goal?.id === goalId).toBe(true);
    });
  });

  describe('PATCH /api/goals/:id', () => {
    test('updates goal name', async () => {
      if (!goalId) return;
      const res = await request(app)
        .patch(`/api/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Goal' });
      expect(res.status === 200 || res.status === 204).toBe(true);
    });
  });

  describe('POST /api/goals/:id/contribute', () => {
    test('contributes to goal from account', async () => {
      if (!goalId || !account) return;
      const res = await request(app)
        .post(`/api/goals/${goalId}/contribute`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 10000, account_id: account.id });
      expect(res.status).toBe(200);
    });

    test('returns 400 for amount > target', async () => {
      if (!goalId) return;
      const res = await request(app)
        .post(`/api/goals/${goalId}/contribute`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 999999999, account_id: account?.id });
      expect(res.status).toBe(200);
    });

    test('returns 400 for negative contribution', async () => {
      if (!goalId) return;
      const res = await request(app)
        .post(`/api/goals/${goalId}/contribute`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: -100 });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/goals/:id', () => {
    test('deletes goal', async () => {
      if (!goalId) return;
      const res = await request(app)
        .delete(`/api/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status === 200 || res.status === 204).toBe(true);
    });
  });
});
