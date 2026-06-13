const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const {
  createTestUser, generateToken, createTestFamily, createTestCategory,
  cleanupUser, cleanupFamily,
} = require('./helpers');

// F3 — режим прозрачности семьи (ТЗ Логика семьи):
// default — личные операции партнёра маскируются («🔒 факт»);
// transparent (show_personal_in_stats=true, меняет только owner) — видны полностью.

let owner, ownerToken, member, memberToken, family, famCat, memberPrivateTxId;

beforeAll(async () => {
  owner = await createTestUser({ name: 'Transp Owner' });
  ownerToken = generateToken(owner.id);
  family = await createTestFamily(owner.id);
  await prisma.user.update({ where: { id: owner.id }, data: { family_id: family.id } });
  await prisma.familyMember.create({ data: { user_id: owner.id, family_id: family.id } });

  member = await createTestUser({ name: 'Transp Member' });
  memberToken = generateToken(member.id);
  await prisma.user.update({ where: { id: member.id }, data: { family_id: family.id } });
  await prisma.familyMember.create({ data: { user_id: member.id, family_id: family.id } });

  famCat = await createTestCategory({ type: 'expense', name: 'TranspCat', family_id: family.id });

  // member создаёт ЛИЧНУЮ операцию
  const res = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${memberToken}`)
    .send({ type: 'expense', amount: 555, category_id: famCat.id, date: '2026-07-02', scope: 'personal' });
  memberPrivateTxId = res.body.transaction?.id;
}, 30000);

afterAll(async () => {
  await prisma.familySettings.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
  await prisma.familyMember.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
  await cleanupUser(member?.id);
  await cleanupUser(owner?.id);
  await cleanupFamily(family?.id);
});

function findTx(body, id) {
  const list = Array.isArray(body) ? body : body.items;
  return list.find((t) => t.id === id);
}

describe('Family transparency mode (F3)', () => {
  test('default: partner sees member private tx MASKED (fact visible, amount hidden)', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    const tx = findTx(res.body, memberPrivateTxId);
    expect(tx).toBeDefined();
    expect(tx.is_hidden).toBe(true);
    expect(tx.amount).toBeNull();
  });

  test('non-owner cannot enable transparency (403)', async () => {
    const res = await request(app)
      .patch('/api/family-settings')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ show_personal_in_stats: true });
    expect(res.status).toBe(403);
  });

  test('owner enables transparency → partner sees private tx in full', async () => {
    const patch = await request(app)
      .patch('/api/family-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ show_personal_in_stats: true });
    expect(patch.status).toBe(200);

    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    const tx = findTx(res.body, memberPrivateTxId);
    expect(tx).toBeDefined();
    expect(tx.is_hidden).toBe(false);
    expect(Number(tx.amount)).toBe(555);
  });
});
