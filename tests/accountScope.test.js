const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const {
  createTestUser, generateToken, createTestFamily, createTestCategory, createTestAccount,
  cleanupUser, cleanupFamily,
} = require('./helpers');

// F4 (ТЗ Логика семьи §5): операция наследует scope выбранного счёта,
// если scope не задан явно. Явный scope переопределяет.

let owner, ownerToken, family, famAcc, persAcc, cat, stranger, strangerAcc;

beforeAll(async () => {
  owner = await createTestUser({ name: 'AccScope Owner' });
  ownerToken = generateToken(owner.id);
  family = await createTestFamily(owner.id);
  await prisma.user.update({ where: { id: owner.id }, data: { family_id: family.id } });

  famAcc = await createTestAccount(owner.id, { scope: 'family', family_id: family.id, name: 'Joint' });
  persAcc = await createTestAccount(owner.id, { scope: 'personal', family_id: null, name: 'Wallet' });
  cat = await createTestCategory({ type: 'expense', name: 'AccScopeCat', family_id: family.id });

  // посторонний пользователь со своим счётом (не в семье)
  stranger = await createTestUser({ name: 'AccScope Stranger' });
  strangerAcc = await createTestAccount(stranger.id, { scope: 'personal', name: 'Foreign' });
}, 30000);

afterAll(async () => {
  await prisma.transaction.deleteMany({ where: { user_id: owner?.id } }).catch(() => {});
  await cleanupUser(stranger?.id);
  await cleanupUser(owner?.id);
  await cleanupFamily(family?.id);
});

async function createTx(body) {
  const res = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ type: 'expense', amount: 100, category_id: cat.id, date: '2026-07-03', ...body });
  expect(res.status).toBe(201);
  const id = res.body.transaction?.id;
  return prisma.transaction.findUnique({ where: { id } });
}

describe('Operation inherits account scope (F4)', () => {
  test('account_id is persisted (was previously stripped by Zod)', async () => {
    const tx = await createTx({ account_id: famAcc.id });
    expect(tx.account_id).toBe(famAcc.id);
  });

  test('no explicit scope + family account → scope=family', async () => {
    const tx = await createTx({ account_id: famAcc.id });
    expect(tx.scope).toBe('family');
  });

  test('foreign account is not linked (account_id null)', async () => {
    const tx = await createTx({ account_id: strangerAcc.id });
    expect(tx.account_id).toBeNull();
  });

  test('no explicit scope + personal account → scope=personal', async () => {
    const tx = await createTx({ account_id: persAcc.id });
    expect(tx.scope).toBe('personal');
  });

  // §4.2 (реверс В4): с СЕМЕЙНОГО счёта личную/скрытую операцию сделать нельзя —
  // явный scope=personal игнорируется, операция остаётся семейной («общий котёл»).
  test('family account forces scope=family even if personal requested', async () => {
    const tx = await createTx({ account_id: famAcc.id, scope: 'personal' });
    expect(tx.scope).toBe('family');
    expect(tx.account_id).toBe(famAcc.id);
  });

  // С ЛИЧНОГО счёта переключение в «Семья» (внести своё в общий бюджет) — разрешено.
  test('explicit family scope on a personal account is allowed', async () => {
    const tx = await createTx({ account_id: persAcc.id, scope: 'family' });
    expect(tx.scope).toBe('family');
    expect(tx.account_id).toBe(persAcc.id);
  });

  // PATCH тоже не должен обходить правило: перенос операции на семейный счёт
  // с попыткой оставить её личной → форсируется family.
  test('PATCH onto a family account forces scope=family (no hiding via update)', async () => {
    const created = await createTx({ account_id: persAcc.id, scope: 'personal' });
    expect(created.scope).toBe('personal');
    const res = await request(app)
      .patch(`/api/transactions/${created.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ account_id: famAcc.id, scope: 'personal' });
    expect(res.status).toBe(200);
    const after = await prisma.transaction.findUnique({ where: { id: created.id } });
    expect(after.scope).toBe('family');
    expect(after.account_id).toBe(famAcc.id);
  });
});
