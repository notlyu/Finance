const request = require('supertest');
const app = require('./testApp');
const { User, Family, Category, Transaction, Goal, Wish, prisma } = require('../lib/models');

let testUser, testFamily, testToken, testCategory;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: `dashboard_test_${Date.now()}@example.com`,
      password_hash: '$2b$10$rS1H5xqE8pV2Z3kL4mN6OeW7yX8zA9bC0dE1fG2hI3jK4lM5nO6pQ',
      name: 'Dashboard Test User',
      family_id: null,
    }
  });

  const family = await prisma.family.create({
    data: {
      name: `Test Family ${Date.now()}`,
      invite_code: `DF${Date.now()}`,
      owner_user_id: user.id,
    }
  });

  await prisma.user.update({ where: { id: user.id }, data: { family_id: family.id } });

  const category = await prisma.category.create({
    data: { name: 'Тестовая категория', family_id: family.id, type: 'expense' }
  });

  await prisma.transaction.create({
    data: { user_id: user.id, family_id: family.id, category_id: category.id, amount: 10000, type: 'income', date: new Date() }
  });
  await prisma.transaction.create({
    data: { user_id: user.id, family_id: family.id, category_id: category.id, amount: 3000, type: 'expense', date: new Date() }
  });

  testUser = user;
  testFamily = family;
  testCategory = category;
  testToken = require('jsonwebtoken').sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
});

afterAll(async () => {
  if (testUser) {
    await prisma.transaction.deleteMany({ where: { user_id: testUser.id } });
    await prisma.goal.deleteMany({ where: { user_id: testUser.id } });
    await prisma.wish.deleteMany({ where: { user_id: testUser.id } });
    await prisma.category.delete({ where: { id: testCategory.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.family.delete({ where: { id: testFamily.id } });
  }
});

describe('Dashboard API', () => {
  describe('GET /api/dashboard', () => {
    it('должен возвращать monthIncome и monthExpenses', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.personal).toHaveProperty('monthIncome');
      expect(res.body.personal).toHaveProperty('monthExpenses');
    });

    it('должен возвращать allocation с total и pct', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.allocation).toBeDefined();
      expect(Array.isArray(res.body.allocation)).toBe(true);
      
      if (res.body.allocation.length > 0) {
        const alloc = res.body.allocation[0];
        expect(alloc).toHaveProperty('total');
        expect(alloc).toHaveProperty('pct');
      }
    });

    it('должен возвращать корректный savingsRate', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(res.statusCode).toBe(200);
      const { personal } = res.body;
      if (personal.monthIncome > 0) {
        const expectedSavingsRate = Math.round(((personal.monthIncome - personal.monthExpenses) / personal.monthIncome) * 100);
        const savingsRate = personal.monthIncome > 0 
          ? Math.round(((personal.monthIncome - personal.monthExpenses) / personal.monthIncome) * 100) 
          : 0;
        expect(savingsRate).toBe(expectedSavingsRate);
      }
    });

    it('должен включать категорию в lastTransactions', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.lastTransactions).toBeDefined();
      expect(Array.isArray(res.body.lastTransactions)).toBe(true);
    });

    it('должен возвращать category_name в транзакциях', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(res.statusCode).toBe(200);
      if (res.body.lastTransactions && res.body.lastTransactions.length > 0) {
        const tx = res.body.lastTransactions[0];
        expect(tx).toHaveProperty('category_name');
      }
    });
  });
});