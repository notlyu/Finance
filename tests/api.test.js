const request = require('supertest');
const app = require('../testApp');
const { User, Family, Category, Goal, GoalContribution, Transaction, prisma } = require('../lib/models');

let testUser, testFamily, testToken, testCategory, testExpenseCat;
const testCategoryIds = [];

beforeAll(async () => {
  // Create test user first (without family)
  const user = await User.create({
    email: `test_${Date.now()}@example.com`,
    password_hash: '$2b$10$rS1H5xqE8pV2Z3kL4mN6OeW7yX8zA9bC0dE1fG2hI3jK4lM5nO6pQ',
    name: 'Test User',
    family_id: null,
  });

  // Create family with owner (unique invite code)
  const family = await Family.create({
    name: `Test Family ${Date.now()}`,
    invite_code: `T${Date.now()}`,
    owner_user_id: user.id,
  });

  // Link user to family
  await user.update({ family_id: family.id });

  testUser = user;
  testFamily = family;
  testToken = require('jsonwebtoken').sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  // Create test categories
  testCategory = await Category.create({
    name: `Test Income ${Date.now()}`,
    type: 'income',
    is_system: false,
  });
  testCategoryIds.push(testCategory.id);
});

afterAll(async () => {
  try {
    if (testUser && testFamily) {
      await GoalContribution.destroy({ where: {} });
      await Transaction.destroy({ where: { family_id: testFamily.id } });
      await Goal.destroy({ where: { family_id: testFamily.id } });
      // Delete only test-created categories (by tracked IDs)
      if (testCategoryIds.length > 0) {
        await Category.destroy({ where: { id: testCategoryIds } });
      }
      await User.destroy({ where: { id: testUser.id } });
      await Family.destroy({ where: { id: testFamily.id } });
    }
  } catch (e) {
    console.warn('Cleanup warning:', e.message);
  }
});

describe('API Tests', () => {
  // 1. Auth
  describe('Auth', () => {
    it('GET /api/auth/me should return user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe(testUser.email);
      expect(res.body.family_id).toBe(testFamily.id);
    });
  });

  // 2. Transactions
  describe('Transactions', () => {
    it('POST /api/transactions should create income', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          amount: 50000,
          type: 'income',
          category_id: testCategory.id,
          date: new Date().toISOString().slice(0, 10),
          comment: 'Test income',
        });
      expect(res.statusCode).toBe(201);
      expect(Number(res.body.transaction.amount)).toBe(50000);
      expect(res.body.transaction.type).toBe('income');
    });

    it('GET /api/transactions should return transactions', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // 3. Goals with auto-contribution
  describe('Goals', () => {
    it('POST /api/goals should create goal with auto-contribute', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Test Goal',
          target_amount: 100000,
          current_amount: 0,
          auto_contribute_enabled: true,
          auto_contribute_type: 'percentage',
          auto_contribute_value: 10,
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Test Goal');
      expect(res.body.auto_contribute_enabled).toBe(true);
    });

    it('GET /api/goals should return goals', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // 4. Wishes
  describe('Wishes', () => {
    it('POST /api/wishes should create wish', async () => {
      // Create an expense category for the wish first
      testExpenseCat = await Category.create({
        name: `Test Expense ${Date.now()}`,
        type: 'expense',
        is_system: false,
      });
      testCategoryIds.push(testExpenseCat.id);
      const res = await request(app)
        .post('/api/wishes')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Test Wish',
          cost: 15000,
          priority: 2,
          status: 'active',
          category_id: testExpenseCat.id,
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Test Wish');
    });

    it('GET /api/wishes should return wishes', async () => {
      const res = await request(app)
        .get('/api/wishes')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // 5. Dashboard
  describe('Dashboard', () => {
    it('GET /api/dashboard should return dashboard data', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('personal');
      expect(res.body).toHaveProperty('lastTransactions');
      expect(res.body).toHaveProperty('activeGoals');
    });
  });

  // 6. Categories
  describe('Categories', () => {
    it('GET /api/categories should return categories', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // 7. Notifications
  describe('Notifications', () => {
    it('GET /api/notifications/settings should return settings', async () => {
      const res = await request(app)
        .get('/api/notifications/settings')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('user_id');
    });
  });
});
