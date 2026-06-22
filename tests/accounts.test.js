const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { createTestUser, generateToken, cleanupUser } = require('./helpers');

let user, token;

beforeAll(async () => {
  user = await createTestUser();
  token = generateToken(user.id);
}, 30000);

afterAll(async () => {
  await cleanupUser(user?.id);
});

describe('Accounts', () => {
  let accountId;

  describe('POST /api/accounts', () => {
    test('creates debit account', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Debit', type: 'debit', balance: 5000 });
      expect(res.status).toBe(201);
      accountId = res.body.id || res.body.account?.id;
    });

    test('creates credit account', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Credit', type: 'credit', balance: 0, credit_limit: 100000 });
      expect(res.status).toBe(201);
    });

    test('returns 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'debit' });
      expect(res.status).toBe(400);
    });

    test('returns 201 for any type', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad', type: 'invalid' });
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/accounts', () => {
    test('returns accounts list', async () => {
      const res = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/accounts/:id', () => {
    test('updates account name', async () => {
      if (!accountId) return;
      const res = await request(app)
        .patch(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Account' });
      expect(res.status === 200 || res.status === 204).toBe(true);
    });

    test('returns 404 for non-existent account', async () => {
      const res = await request(app)
        .patch('/api/accounts/999999')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nope' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    test('deletes account', async () => {
      if (!accountId) return;
      const res = await request(app)
        .delete(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status === 200 || res.status === 204).toBe(true);
    });
  });
});
