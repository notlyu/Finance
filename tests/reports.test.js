const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { createTestUser, generateToken, createTestCategory, cleanupUser } = require('./helpers');

let user, token, cat;

beforeAll(async () => {
  user = await createTestUser();
  token = generateToken(user.id);
  cat = await createTestCategory({ user_id: user.id });

  // Create some test transactions
  const today = new Date();
  const baseTx = { user_id: user.id, category_id: cat.id, date: today };
  await prisma.transaction.createMany({
    data: [
      { ...baseTx, type: 'income', amount: 50000 },
      { ...baseTx, type: 'expense', amount: 15000 },
      { ...baseTx, type: 'expense', amount: 8000, date: new Date('2026-03-15') },
    ],
  });
}, 30000);

afterAll(async () => {
  await cleanupUser(user?.id);
});

describe('Reports', () => {
  describe('GET /api/reports/dynamics', () => {
    test('returns dynamics data', async () => {
      const res = await request(app)
        .get('/api/reports/dynamics')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('accepts periodStart and periodEnd', async () => {
      const res = await request(app)
        .get('/api/reports/dynamics?periodStart=2026-01-01&periodEnd=2026-12-31')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/reports/expenses-by-category', () => {
    test('returns expenses breakdown', async () => {
      const res = await request(app)
        .get('/api/reports/expenses-by-category')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/reports/income-by-category', () => {
    test('returns income breakdown', async () => {
      const res = await request(app)
        .get('/api/reports/income-by-category')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/reports/export', () => {
    test('export returns data', async () => {
      const res = await request(app)
        .get('/api/reports/export?format=json')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });
});
