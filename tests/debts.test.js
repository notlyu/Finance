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

describe('Debts', () => {
  let debtId;

  describe('POST /api/debts', () => {
    test('creates a debt', async () => {
      const res = await request(app)
        .post('/api/debts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Loan',
          total_amount: 200000,
          remaining: 200000,
          monthly_payment: 10000,
          type: 'lend',
          start_date: '2024-01-01',
        });
      expect(res.status).toBe(201);
      debtId = res.body.id;
    });

    test('creates a borrow debt', async () => {
      const res = await request(app)
        .post('/api/debts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Borrowed',
          total_amount: 50000,
          remaining: 50000,
          monthly_payment: 5000,
          type: 'borrow',
          start_date: '2024-01-01',
        });
      expect(res.status).toBe(201);
    });

    test('returns 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/debts')
        .set('Authorization', `Bearer ${token}`)
        .send({ total_amount: 1000 });
      expect(res.status).toBe(400);
    });

    test('returns 400 for invalid type', async () => {
      const res = await request(app)
        .post('/api/debts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad', total_amount: 1000, remaining_amount: 1000, type: 'invalid' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/debts', () => {
    test('returns debts list', async () => {
      const res = await request(app)
        .get('/api/debts')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    });
  });

  describe('PATCH /api/debts/:id', () => {
    test('updates debt name', async () => {
      if (!debtId) return;
      const res = await request(app)
        .patch(`/api/debts/${debtId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Loan' });
      expect(res.status === 200 || res.status === 204).toBe(true);
    });
  });

  describe('PATCH /api/debts/:id/close-partial', () => {
    test('makes partial payment', async () => {
      if (!debtId || !account) return;
      const res = await request(app)
        .patch(`/api/debts/${debtId}/close-partial`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 10000, account_id: account.id });
      expect(res.status).toBe(200);
    });

    test('returns 200 clamping amount to remaining', async () => {
      if (!debtId) return;
      const res = await request(app)
        .patch(`/api/debts/${debtId}/close-partial`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 999999999, account_id: account?.id });
      expect(res.status).toBe(200);
    });

    test('returns 400 for negative amount', async () => {
      if (!debtId) return;
      const res = await request(app)
        .patch(`/api/debts/${debtId}/close-partial`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: -100 });
      expect(res.status).toBe(400);
    });

    test('succeeds without account_id', async () => {
      if (!debtId) return;
      const res = await request(app)
        .patch(`/api/debts/${debtId}/close-partial`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 5000 });
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/debts/:id', () => {
    test('deletes debt', async () => {
      if (!debtId) return;
      const res = await request(app)
        .delete(`/api/debts/${debtId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status === 200 || res.status === 204).toBe(true);
    });
  });
});
