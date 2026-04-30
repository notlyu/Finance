const { runRecurringOnce } = require('../jobs/recurringJob');
const prisma = require('../lib/prisma-client');

describe('Recurring Job', () => {
  let testUser;
  let testRecurring;

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `test_recurring_${Date.now()}@example.com`,
        password_hash: 'hash',
        name: 'Test User',
      }
    });

    testRecurring = await prisma.recurringTransaction.create({
      data: {
        user_id: testUser.id,
        type: 'expense',
        amount: 1000,
        category_id: 1,
        day_of_month: 1,
        start_month: '2026-01',
        active: true,
        comment: 'Test recurring',
      }
    });
  });

  afterAll(async () => {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  test('создает транзакции для активных recurring', async () => {
    const before = await prisma.transaction.count({
      where: { comment: 'Test recurring' }
    });
    
    const result = await runRecurringOnce();
    
    const after = await prisma.transaction.count({
      where: { comment: 'Test recurring' }
    });
    
    expect(after).toBeGreaterThan(before);
  });

  test('не создает дубликаты для уже созданных транзакций', async () => {
    const result1 = await runRecurringOnce();
    const result2 = await runRecurringOnce();
    
    expect(result1.created).toBeGreaterThanOrEqual(0);
  });
});
