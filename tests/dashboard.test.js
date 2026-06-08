const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { createTestUser, generateToken, createTestCategory, createTestFamily, cleanupUser, cleanupFamily } = require('./helpers');

let user, token, cat, family;

beforeAll(async () => {
  user = await createTestUser();
  token = generateToken(user.id);
  cat = await createTestCategory({ user_id: user.id });

  // Create test data
  const today = new Date();
  const baseTx = { user_id: user.id, category_id: cat.id, date: today };
  await prisma.transaction.createMany({
    data: [
      { ...baseTx, type: 'income', amount: 50000 },
      { ...baseTx, type: 'expense', amount: 20000 },
    ],
  });

  family = await createTestFamily(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { family_id: family.id } });
}, 30000);

afterAll(async () => {
  await cleanupUser(user?.id);
  await cleanupFamily(family?.id);
});

describe('Dashboard', () => {
  test('GET /api/dashboard returns dashboard data', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('personal');
    expect(res.body).toHaveProperty('family');
    expect(res.body.personal).toHaveProperty('monthIncome');
    expect(res.body.personal).toHaveProperty('monthExpenses');
  });

  test('returns correct income/expense values', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Number(res.body.personal.monthIncome)).toBeGreaterThanOrEqual(50000);
    expect(Number(res.body.personal.monthExpenses)).toBeGreaterThanOrEqual(20000);
  });

  test('returns lastTransactions array', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.lastTransactions)).toBe(true);
  });

  test('returns allocation data', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.allocation)).toBe(true);
  });

  test('family dashboard returns member stats', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.family.memberStats)).toBe(true);
  });

  test('GET /api/dashboard/personal alias works', async () => {
    const res = await request(app)
      .get('/api/dashboard/personal')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('accepts memberId parameter for family', async () => {
    const res = await request(app)
      .get('/api/dashboard?memberId=' + user.id)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
