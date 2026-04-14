const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let testUser, testFamily, testToken, testCategory, testExpenseCat;

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('test123456', 10);
  
  testUser = await prisma.user.create({
    data: {
      email: `test_${Date.now()}@example.com`,
      password_hash: passwordHash,
      name: 'Test User',
    }
  });

  testFamily = await prisma.family.create({
    data: {
      name: `Test Family ${Date.now()}`,
      invite_code: `T${Date.now()}`,
      owner_user_id: testUser.id,
    }
  });

  await prisma.user.update({
    where: { id: testUser.id },
    data: { family_id: testFamily.id }
  });

  testToken = jwt.sign({ id: testUser.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });

  testCategory = await prisma.category.create({
    data: { name: 'Test Income Cat', type: 'income', family_id: testFamily.id, user_id: testUser.id }
  });

  testExpenseCat = await prisma.category.create({
    data: { name: 'Test Expense Cat', type: 'expense', family_id: testFamily.id, user_id: testUser.id }
  });
}, 30000);

afterAll(async () => {
  if (testUser) {
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
  }
  if (testFamily) {
    await prisma.family.delete({ where: { id: testFamily.id } }).catch(() => {});
  }
});

describe('API Tests', () => {
  describe('Auth', () => {
    test('GET /api/auth/me should return user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(testUser.email);
    });
  });

  describe('Transactions', () => {
    test('POST /api/transactions should create income', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          type: 'income',
          amount: 5000,
          category_id: testCategory.id,
          date: '2026-04-10',
        });
      expect(res.status).toBe(201);
    });

    test('GET /api/transactions should return transactions', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Goals', () => {
    test('POST /api/goals should create goal with auto-contribute', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Test Goal',
          target_amount: 10000,
          auto_contribute_enabled: true,
          auto_contribute_type: 'percentage',
          auto_contribute_value: 10,
        });
      expect(res.status).toBe(201);
    });

    test('GET /api/goals should return goals', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Wishes', () => {
    test('POST /api/wishes should create wish', async () => {
      const res = await request(app)
        .post('/api/wishes')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Test Wish',
          cost: 5000,
        });
      expect(res.status).toBe(201);
    });

    test('GET /api/wishes should return wishes', async () => {
      const res = await request(app)
        .get('/api/wishes')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Dashboard', () => {
    test('GET /api/dashboard should return dashboard data', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('family');
      expect(res.body).toHaveProperty('personal');
    });
  });

  describe('Categories', () => {
    test('GET /api/categories should return categories', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Notifications', () => {
    test('GET /api/notifications/settings should return settings', async () => {
      const res = await request(app)
        .get('/api/notifications/settings')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.status).toBe(200);
    });
  });
});