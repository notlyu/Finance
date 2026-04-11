const request = require('supertest');
const app = require('../testApp');
const { prisma } = require('../lib/models');

let testUser, testToken, testCategory;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: `category_test_${Date.now()}@example.com`,
      password_hash: '$2b$10$rS1H5xqE8pV2Z3kL4mN6OeW7yX8zA9bC0dE1fG2hI3jK4lM5nO6pQ',
      name: 'Category Test User',
      family_id: null,
    }
  });

  const category = await prisma.category.create({
    data: { name: 'Тест Категория', family_id: null, type: 'expense' }
  });

  await prisma.transaction.create({
    data: {
      user_id: user.id,
      family_id: null,
      category_id: category.id,
      amount: 5000,
      type: 'expense',
      date: new Date()
    }
  });

  testUser = user;
  testCategory = category;
  testToken = require('jsonwebtoken').sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
});

afterAll(async () => {
  if (testUser) {
    await prisma.transaction.deleteMany({ where: { user_id: testUser.id } });
    await prisma.category.delete({ where: { id: testCategory.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  }
});

describe('Categories in Transactions', () => {
  it('GET /api/transactions should return category_name', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.statusCode).toBe(200);
    
    const items = res.body.items || res.body;
    expect(items).toBeDefined();
    
    const tx = items.find(t => t.type === 'expense');
    if (tx) {
      expect(tx).toHaveProperty('category_name');
      console.log('category_name:', tx.category_name);
    }
  });
});