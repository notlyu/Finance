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

describe('Export', () => {
  describe('GET /api/export/transactions', () => {
    test('exports transactions as csv', async () => {
      const res = await request(app)
        .get('/api/export/transactions?format=csv')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('exports transactions as xlsx', async () => {
      const res = await request(app)
        .get('/api/export/transactions?format=xlsx')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('exports with date filter', async () => {
      const res = await request(app)
        .get('/api/export/transactions?format=csv&startDate=2026-01-01&endDate=2026-12-31')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/export/goals', () => {
    test('exports goals as csv', async () => {
      const res = await request(app)
        .get('/api/export/goals?format=csv')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/export/wishes', () => {
    test('exports wishes as csv', async () => {
      const res = await request(app)
        .get('/api/export/wishes?format=csv')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/export/budgets', () => {
    test('exports budgets as csv', async () => {
      const res = await request(app)
        .get('/api/export/budgets?format=csv')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });
});
