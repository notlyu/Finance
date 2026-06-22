const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const {
  createTestUser, generateToken, createTestFamily,
  createTestCategory, cleanupUser, cleanupFamily,
} = require('./helpers');

let owner, ownerToken, member, memberToken, soloUser, soloToken, testFamily;
let familyCat, soloCat;

beforeAll(async () => {
  owner = await createTestUser({ name: 'Scope Owner' });
  ownerToken = generateToken(owner.id);
  testFamily = await createTestFamily(owner.id);
  await prisma.user.update({ where: { id: owner.id }, data: { family_id: testFamily.id } });
  await prisma.familyMember.create({ data: { user_id: owner.id, family_id: testFamily.id } }).catch(() => {});

  member = await createTestUser({ name: 'Scope Member' });
  memberToken = generateToken(member.id);
  await prisma.user.update({ where: { id: member.id }, data: { family_id: testFamily.id } });
  await prisma.familyMember.create({ data: { user_id: member.id, family_id: testFamily.id } }).catch(() => {});

  soloUser = await createTestUser({ name: 'Scope Solo' });
  soloToken = generateToken(soloUser.id);

  familyCat = await createTestCategory({ type: 'expense', name: 'FamCat', family_id: testFamily.id });
  soloCat = await createTestCategory({ type: 'expense', name: 'SoloCat', user_id: soloUser.id });
}, 30000);

afterAll(async () => {
  await prisma.familyInvite.deleteMany({ where: { family_id: testFamily?.id } }).catch(() => {});
  await prisma.familySettings.deleteMany({ where: { family_id: testFamily?.id } }).catch(() => {});
  await prisma.familyMember.deleteMany({ where: { family_id: testFamily?.id } }).catch(() => {});
  await cleanupUser(member?.id);
  await cleanupUser(soloUser?.id);
  await cleanupUser(owner?.id);
  await cleanupFamily(testFamily?.id);
});

describe('Scope isolation (7.2)', () => {
  describe('Solo user data is private', () => {
    let soloTxId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${soloToken}`)
        .send({ type: 'expense', amount: 777, category_id: soloCat.id, date: '2026-07-01', scope: 'personal' });
      soloTxId = res.body.transaction?.id;
    });

    test('solo user sees own transaction', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${soloToken}`);
      expect(res.status).toBe(200);
      const list = Array.isArray(res.body) ? res.body : res.body.items;
      expect(list.some(t => t.id === soloTxId)).toBe(true);
    });

    test('family owner does NOT see solo user transaction', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      const list = Array.isArray(res.body) ? res.body : res.body.items;
      expect(list.some(t => t.id === soloTxId)).toBe(false);
    });

    test('solo user cannot fetch family transaction by id', async () => {
      const famTx = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ type: 'expense', amount: 555, category_id: familyCat.id, date: '2026-07-02', scope: 'family' });
      const famTxId = famTx.body.transaction?.id;

      const res = await request(app)
        .get(`/api/transactions/${famTxId}`)
        .set('Authorization', `Bearer ${soloToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Family-scoped data is shared between members', () => {
    let familyTxId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ type: 'expense', amount: 1234, category_id: familyCat.id, date: '2026-07-03', scope: 'family' });
      familyTxId = res.body.transaction?.id;
    });

    test('owner sees the family transaction', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${ownerToken}`);
      const list = Array.isArray(res.body) ? res.body : res.body.items;
      expect(list.some(t => t.id === familyTxId)).toBe(true);
    });

    test('member sees the family transaction', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${memberToken}`);
      const list = Array.isArray(res.body) ? res.body : res.body.items;
      const tx = list.find(t => t.id === familyTxId);
      expect(tx).toBeTruthy();
      expect(tx.is_hidden).toBeFalsy();
      expect(Number(tx.amount)).toBe(1234);
    });
  });

  describe('Personal-scoped data inside family is masked from other members', () => {
    let personalTxId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ type: 'expense', amount: 9999, category_id: familyCat.id, date: '2026-07-04', scope: 'personal' });
      personalTxId = res.body.transaction?.id;
    });

    test('owner sees full details of own personal transaction', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${ownerToken}`);
      const list = Array.isArray(res.body) ? res.body : res.body.items;
      const tx = list.find(t => t.id === personalTxId);
      expect(tx).toBeTruthy();
      expect(Number(tx.amount)).toBe(9999);
      expect(tx.is_hidden).toBeFalsy();
    });

    test('other member sees the row but amount is masked (hidden)', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${memberToken}`);
      const list = Array.isArray(res.body) ? res.body : res.body.items;
      const tx = list.find(t => t.id === personalTxId);
      if (tx) {
        expect(tx.is_hidden).toBe(true);
        expect(tx.amount).toBeNull();
      }
    });
  });

  describe('Goals scope isolation', () => {
    let soloGoalId;

    beforeAll(async () => {
      const goal = await prisma.goal.create({
        data: {
          user_id: soloUser.id, name: 'Solo Goal', target_amount: 5000,
          current_amount: 0, scope: 'personal',
        },
      });
      soloGoalId = goal.id;
    });

    test('family owner does not see solo user goal', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      const list = res.body.items || res.body;
      expect(list.some(g => g.id === soloGoalId)).toBe(false);
    });

    test('solo user sees own goal', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${soloToken}`);
      const list = res.body.items || res.body;
      expect(list.some(g => g.id === soloGoalId)).toBe(true);
    });
  });
});
