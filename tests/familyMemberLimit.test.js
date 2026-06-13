const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const {
  createTestUser, generateToken, createTestFamily,
  cleanupUser, cleanupFamily,
} = require('./helpers');

// В5: лимит участников семьи (по умолчанию 6). 7-й присоединиться не может.

const LIMIT = Number(process.env.MAX_FAMILY_MEMBERS) || 6;

let owner, family, newcomer, newcomerToken;
const fillers = [];

async function makeInvite(familyId, createdBy) {
  const code = (Date.now().toString(36) + Math.random().toString(36).slice(2))
    .toUpperCase().slice(0, 10).padEnd(10, 'X');
  await prisma.familyInvite.create({
    data: { family_id: familyId, created_by: createdBy, code, expires_at: new Date(Date.now() + 86400000) },
  });
  return code;
}

beforeAll(async () => {
  owner = await createTestUser({ name: 'Limit Owner' });
  family = await createTestFamily(owner.id);
  await prisma.user.update({ where: { id: owner.id }, data: { family_id: family.id } });
  await prisma.familyMember.create({ data: { user_id: owner.id, family_id: family.id } });

  // добиваем семью до лимита (owner уже 1-й)
  for (let i = 0; i < LIMIT - 1; i++) {
    const u = await createTestUser({ name: `Filler ${i}` });
    await prisma.user.update({ where: { id: u.id }, data: { family_id: family.id } });
    await prisma.familyMember.create({ data: { user_id: u.id, family_id: family.id } });
    fillers.push(u);
  }

  newcomer = await createTestUser({ name: 'Limit Newcomer' });
  newcomerToken = generateToken(newcomer.id);
}, 60000);

afterAll(async () => {
  await prisma.familyInvite.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
  await prisma.familyMember.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
  await cleanupUser(newcomer?.id);
  for (const u of fillers) await cleanupUser(u.id);
  await cleanupUser(owner?.id);
  await cleanupFamily(family?.id);
});

describe('Family member limit (В5)', () => {
  test('join is rejected when family is at the member limit', async () => {
    const count = await prisma.user.count({ where: { family_id: family.id } });
    expect(count).toBe(LIMIT);

    const code = await makeInvite(family.id, owner.id);
    const res = await request(app)
      .post('/api/auth/family/join')
      .set('Authorization', `Bearer ${newcomerToken}`)
      .send({ inviteCode: code });

    expect(res.status).toBe(400);
    // новичок не добавлен
    const fresh = await prisma.user.findUnique({ where: { id: newcomer.id } });
    expect(fresh.family_id).toBeNull();
  });
});
