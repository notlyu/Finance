const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { createTestUser, generateToken, createTestAccount, cleanupUser } = require('./helpers');

let user, token, account;

beforeAll(async () => {
  user = await createTestUser();
  token = generateToken(user.id);
  account = await createTestAccount(user.id, { balance: 100000 });
}, 30000);

afterAll(async () => {
  await cleanupUser(user?.id);
});

describe('Wishes', () => {
  let wishId;

  describe('POST /api/wishes', () => {
    test('creates a wish', async () => {
      const res = await request(app)
        .post('/api/wishes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Phone', cost: 80000 });
      expect(res.status).toBe(201);
      wishId = res.body.id;
    });

    test('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/wishes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad Wish' });
      expect(res.status).toBe(400);
    });

    test('returns 400 for cost <= 0', async () => {
      const res = await request(app)
        .post('/api/wishes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad', cost: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/wishes', () => {
    test('returns wishes list', async () => {
      const res = await request(app)
        .get('/api/wishes')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    });

    test('filters archived', async () => {
      const res = await request(app)
        .get('/api/wishes?showArchived=true')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/wishes/:id', () => {
    test('returns wish by id', async () => {
      if (!wishId) return;
      const res = await request(app)
        .get(`/api/wishes/${wishId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/wishes/:id', () => {
    test('updates wish name', async () => {
      if (!wishId) return;
      const res = await request(app)
        .patch(`/api/wishes/${wishId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Wish' });
      expect(res.status === 200 || res.status === 204).toBe(true);
    });
  });

  describe('POST /api/wishes/:id/fund', () => {
    test('funds a wish from account', async () => {
      if (!wishId || !account) return;
      const res = await request(app)
        .post(`/api/wishes/${wishId}/fund`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 50000, account_id: account.id });
      expect(res.status).toBe(201);
    });

    test('returns 400 for amount > remaining cost', async () => {
      if (!wishId) return;
      const res = await request(app)
        .post(`/api/wishes/${wishId}/fund`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 999999999, account_id: account?.id });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/wishes/:id', () => {
    test('deletes wish', async () => {
      if (!wishId) return;
      const res = await request(app)
        .delete(`/api/wishes/${wishId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status === 200 || res.status === 204).toBe(true);
    });
  });
});
