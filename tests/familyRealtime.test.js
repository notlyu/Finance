jest.mock('../lib/socket', () => ({
  initSocket: jest.fn(),
  emitToUser: jest.fn(),
  emitToFamily: jest.fn(),
  emitNotification: jest.fn(),
  emitFamilyUpdate: jest.fn(),
  getIO: jest.fn(() => null),
}));

const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const socket = require('../lib/socket');
const {
  createTestUser, generateToken, createTestFamily, createTestCategory,
  cleanupUser, cleanupFamily,
} = require('./helpers');

// #9: realtime для семьи — при изменении СЕМЕЙНЫХ операций уведомляем участников
// (emitFamilyUpdate), для ЛИЧНЫХ — нет (приватность).

let owner, ownerToken, family, cat;

beforeAll(async () => {
  owner = await createTestUser({ name: 'RT Owner' });
  ownerToken = generateToken(owner.id);
  family = await createTestFamily(owner.id);
  await prisma.user.update({ where: { id: owner.id }, data: { family_id: family.id } });
  cat = await createTestCategory({ type: 'expense', name: 'RTCat', family_id: family.id });
});

afterAll(async () => {
  await prisma.transaction.deleteMany({ where: { user_id: owner?.id } }).catch(() => {});
  await cleanupUser(owner?.id);
  await cleanupFamily(family?.id);
});

beforeEach(() => socket.emitFamilyUpdate.mockClear());

async function createTx(scope) {
  return request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ type: 'expense', amount: 100, category_id: cat.id, date: '2026-07-04', scope });
}

describe('Family realtime emit (#9)', () => {
  test('family transaction emits family_update (excluding author)', async () => {
    const res = await createTx('family');
    expect(res.status).toBe(201);
    expect(socket.emitFamilyUpdate).toHaveBeenCalledWith(
      family.id,
      'family_update',
      { resource: 'transactions', by: owner.id },
      owner.id,
    );
  });

  test('personal transaction does NOT emit family_update', async () => {
    const res = await createTx('personal');
    expect(res.status).toBe(201);
    expect(socket.emitFamilyUpdate).not.toHaveBeenCalled();
  });
});

async function createGoal(scope) {
  return request(app)
    .post('/api/goals')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: `Goal ${scope} ${Date.now()}`, target_amount: 5000, scope });
}

describe('Family realtime emit — goals (#9)', () => {
  test('family goal emits family_update with resource=goals', async () => {
    const res = await createGoal('family');
    expect(res.status).toBe(201);
    expect(socket.emitFamilyUpdate).toHaveBeenCalledWith(
      family.id, 'family_update', { resource: 'goals', by: owner.id }, owner.id,
    );
  });

  test('personal goal does NOT emit family_update', async () => {
    const res = await createGoal('personal');
    expect(res.status).toBe(201);
    expect(socket.emitFamilyUpdate).not.toHaveBeenCalled();
  });
});
