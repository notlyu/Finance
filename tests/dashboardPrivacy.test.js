const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const {
  createTestUser, generateToken, createTestFamily, createTestCategory, createTestAccount,
  cleanupUser, cleanupFamily,
} = require('./helpers');

// Приватность семейного дашборда: «общий котёл» — только семейное.
// Личные счета/операции партнёра НЕ должны попадать в семейный баланс,
// итоги месяца и карточки вкладов (memberStats). См. В6.

let owner, ownerToken, member, family, cat;
const FAMILY_EXPENSE = 1000;
const MEMBER_PRIVATE_EXPENSE = 5000;
const FAMILY_ACC_BALANCE = 7000;
const MEMBER_PRIVATE_ACC_BALANCE = 99999;

function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), Math.min(d.getDate(), 28));
}

beforeAll(async () => {
  owner = await createTestUser({ name: 'Dash Owner' });
  ownerToken = generateToken(owner.id);
  family = await createTestFamily(owner.id);
  await prisma.user.update({ where: { id: owner.id }, data: { family_id: family.id } });

  member = await createTestUser({ name: 'Dash Member' });
  await prisma.user.update({ where: { id: member.id }, data: { family_id: family.id } });

  cat = await createTestCategory({ type: 'expense', name: 'DashCat', family_id: family.id });

  await createTestAccount(owner.id, { scope: 'family', family_id: family.id, balance: FAMILY_ACC_BALANCE, name: 'Joint' });
  await createTestAccount(member.id, { scope: 'personal', balance: MEMBER_PRIVATE_ACC_BALANCE, name: 'Member wallet' });

  await prisma.transaction.createMany({
    data: [
      { user_id: owner.id, family_id: family.id, category_id: cat.id, type: 'expense', amount: FAMILY_EXPENSE, scope: 'family', date: today() },
      // личный (секретный) расход участника — family_id проставлен, как делает createTransaction
      { user_id: member.id, family_id: family.id, category_id: cat.id, type: 'expense', amount: MEMBER_PRIVATE_EXPENSE, scope: 'personal', date: today() },
    ],
  });
});

afterAll(async () => {
  await prisma.transaction.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
  await cleanupUser(member?.id);
  await cleanupUser(owner?.id);
  await cleanupFamily(family?.id);
});

async function familySection() {
  const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${ownerToken}`);
  expect(res.status).toBe(200);
  return res.body.family;
}

describe('Family dashboard privacy (общий котёл = только семейное)', () => {
  test('family balance excludes partner personal account', async () => {
    const fam = await familySection();
    expect(fam.balance).toBe(FAMILY_ACC_BALANCE); // без личного счёта участника
  });

  test('family month totals exclude partner private expense', async () => {
    const fam = await familySection();
    expect(fam.monthExpenses).toBe(FAMILY_EXPENSE);
  });

  test('memberStats do not expose partner private expense', async () => {
    const fam = await familySection();
    const stat = fam.memberStats.find(s => s.userId === member.id);
    expect(stat).toBeDefined();
    expect(stat.expenses).toBe(0); // у участника нет семейных расходов; личное не раскрывается
  });
});
