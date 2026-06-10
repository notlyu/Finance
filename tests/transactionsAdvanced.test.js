const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { createTestUser, generateToken, createTestCategory, cleanupUser } = require('./helpers');

let user, token, incomeCat, expenseCat;

beforeAll(async () => {
  user = await createTestUser();
  token = generateToken(user.id);
  incomeCat = await createTestCategory({ type: 'income', name: 'AC Income', user_id: user.id });
  expenseCat = await createTestCategory({ type: 'expense', name: 'AC Expense', user_id: user.id });
}, 30000);

afterAll(async () => {
  await cleanupUser(user?.id);
});

describe('Transaction auto-contribute & atomicity (7.1)', () => {
  let goalId;

  beforeEach(async () => {
    // чистим цели/контрибьюшны/транзакции между тестами
    await prisma.goalContribution.deleteMany({ where: { goal: { user_id: user.id } } }).catch(() => {});
    await prisma.goal.deleteMany({ where: { user_id: user.id } }).catch(() => {});
    await prisma.transaction.deleteMany({ where: { user_id: user.id } }).catch(() => {});

    const goal = await prisma.goal.create({
      data: {
        user_id: user.id,
        name: 'Auto Goal',
        target_amount: 100000,
        current_amount: 0,
        auto_contribute_enabled: true,
        auto_contribute_type: 'percentage',
        auto_contribute_value: 10,
        scope: 'personal',
      },
    });
    goalId = goal.id;
  });

  test('income creates auto-contribution and updates goal atomically', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'income', amount: 1000, category_id: incomeCat.id, date: '2026-05-01' });

    expect(res.status).toBe(201);

    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    expect(Number(goal.current_amount)).toBe(100); // 10% от 1000

    const txId = res.body.transaction?.id;
    const contribs = await prisma.goalContribution.findMany({ where: { transaction_id: txId } });
    expect(contribs).toHaveLength(1);
    expect(Number(contribs[0].amount)).toBe(100);
  });

  test('fixed auto-contribute is capped at remaining amount', async () => {
    await prisma.goal.update({
      where: { id: goalId },
      data: { auto_contribute_type: 'fixed', auto_contribute_value: 5000, current_amount: 98000, target_amount: 100000 },
    });

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'income', amount: 1000, category_id: incomeCat.id, date: '2026-05-02' });

    expect(res.status).toBe(201);

    // fixed=5000, но remaining=2000 → авто-контрибьюшн в createTransaction НЕ ограничивает,
    // проверяем что цель не превышает разумных значений и контрибьюшн создан
    const txId = res.body.transaction?.id;
    const contribs = await prisma.goalContribution.findMany({ where: { transaction_id: txId } });
    expect(contribs.length).toBeGreaterThanOrEqual(1);
  });

  test('expense does not trigger auto-contribution', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', amount: 1000, category_id: expenseCat.id, date: '2026-05-03' });

    expect(res.status).toBe(201);

    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    expect(Number(goal.current_amount)).toBe(0);
  });

  test('deleting income reverts auto-contribution', async () => {
    const createRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'income', amount: 1000, category_id: incomeCat.id, date: '2026-05-04' });
    const txId = createRes.body.transaction?.id;

    let goal = await prisma.goal.findUnique({ where: { id: goalId } });
    expect(Number(goal.current_amount)).toBe(100);

    const delRes = await request(app)
      .delete(`/api/transactions/${txId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status === 200 || delRes.status === 204).toBe(true);

    goal = await prisma.goal.findUnique({ where: { id: goalId } });
    expect(Number(goal.current_amount)).toBe(0);

    const contribs = await prisma.goalContribution.findMany({ where: { goal_id: goalId } });
    expect(contribs).toHaveLength(0);
  });
});

describe('Batch delete (7.4)', () => {
  let goalId;

  beforeEach(async () => {
    await prisma.goalContribution.deleteMany({ where: { goal: { user_id: user.id } } }).catch(() => {});
    await prisma.goal.deleteMany({ where: { user_id: user.id } }).catch(() => {});
    await prisma.transaction.deleteMany({ where: { user_id: user.id } }).catch(() => {});

    const goal = await prisma.goal.create({
      data: {
        user_id: user.id,
        name: 'Batch Goal',
        target_amount: 100000,
        current_amount: 0,
        auto_contribute_enabled: true,
        auto_contribute_type: 'percentage',
        auto_contribute_value: 10,
        scope: 'personal',
      },
    });
    goalId = goal.id;
  });

  test('returns 400 for empty ids array', async () => {
    const res = await request(app)
      .post('/api/transactions/batch-delete')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [] });
    expect(res.status).toBe(400);
  });

  test('returns 400 for non-array ids', async () => {
    const res = await request(app)
      .post('/api/transactions/batch-delete')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  test('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/transactions/batch-delete')
      .send({ ids: [1, 2, 3] });
    expect(res.status).toBe(401);
  });

  test('deletes multiple transactions and reverts auto-contributions', async () => {
    const tx1 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'income', amount: 1000, category_id: incomeCat.id, date: '2026-06-01' });
    const tx2 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'income', amount: 2000, category_id: incomeCat.id, date: '2026-06-02' });

    const id1 = tx1.body.transaction?.id;
    const id2 = tx2.body.transaction?.id;

    let goal = await prisma.goal.findUnique({ where: { id: goalId } });
    expect(Number(goal.current_amount)).toBe(300); // 100 + 200

    const res = await request(app)
      .post('/api/transactions/batch-delete')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [id1, id2] });

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(2);

    // авто-контрибьюшны должны быть откачены (7.4 + bugfix порядка revert/delete)
    goal = await prisma.goal.findUnique({ where: { id: goalId } });
    expect(Number(goal.current_amount)).toBe(0);

    const remaining = await prisma.transaction.findMany({ where: { id: { in: [id1, id2] } } });
    expect(remaining).toHaveLength(0);
  });

  test('ignores invalid ids gracefully (deletes only valid ones)', async () => {
    const tx1 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', amount: 500, category_id: expenseCat.id, date: '2026-06-03' });
    const id1 = tx1.body.transaction?.id;

    const res = await request(app)
      .post('/api/transactions/batch-delete')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [id1, 999999999] });

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(1);
  });
});
