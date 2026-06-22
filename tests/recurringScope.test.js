const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const {
  createTestUser, generateToken, createTestFamily, createTestCategory, createTestAccount,
  cleanupUser, cleanupFamily,
} = require('./helpers');

// F4-паритет: регулярная операция наследует scope выбранного счёта,
// если scope не задан явно (важно: cron-генерируемые tx берут scope/family_id из шаблона).

let owner, ownerToken, family, famAcc, persAcc, cat;

beforeAll(async () => {
  owner = await createTestUser({ name: 'RecScope Owner' });
  ownerToken = generateToken(owner.id);
  family = await createTestFamily(owner.id);
  await prisma.user.update({ where: { id: owner.id }, data: { family_id: family.id } });

  famAcc = await createTestAccount(owner.id, { scope: 'family', family_id: family.id, name: 'Joint' });
  persAcc = await createTestAccount(owner.id, { scope: 'personal', family_id: null, name: 'Wallet' });
  cat = await createTestCategory({ type: 'expense', name: 'RecScopeCat', family_id: family.id });
}, 30000);

afterAll(async () => {
  await prisma.recurringTransaction.deleteMany({ where: { user_id: owner?.id } }).catch(() => {});
  await cleanupUser(owner?.id);
  await cleanupFamily(family?.id);
});

async function createRecurring(body) {
  const res = await request(app)
    .post('/api/recurring')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ type: 'expense', amount: 300, category_id: cat.id, day_of_month: 5, start_month: '2026-06', ...body });
  expect(res.status).toBe(201);
  return prisma.recurringTransaction.findUnique({ where: { id: res.body.id } });
}

describe('Recurring inherits account scope (F4 parity)', () => {
  test('no explicit scope + family account → scope=family, family_id set', async () => {
    const r = await createRecurring({ account_id: famAcc.id });
    expect(r.scope).toBe('family');
    expect(r.family_id).toBe(family.id);
  });

  test('no explicit scope + personal account → scope=personal, family_id null', async () => {
    const r = await createRecurring({ account_id: persAcc.id });
    expect(r.scope).toBe('personal');
    expect(r.family_id).toBeNull();
  });

  test('explicit scope overrides account scope', async () => {
    const r = await createRecurring({ account_id: famAcc.id, scope: 'personal' });
    expect(r.scope).toBe('personal');
  });
});
