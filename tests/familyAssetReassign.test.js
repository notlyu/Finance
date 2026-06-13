const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const {
  createTestUser, generateToken, createTestFamily,
  cleanupUser, cleanupFamily,
} = require('./helpers');

// В2: при выходе/удалении участника его СЕМЕЙНЫЕ цели/желания/долги
// переназначаются на владельца семьи (принадлежат семье, не уходят с участником).

async function makeFamilyGoal(userId, familyId, name) {
  return prisma.goal.create({
    data: { user_id: userId, family_id: familyId, name, target_amount: 10000, scope: 'family' },
  });
}

describe('Family asset reassignment on leave/remove (В2)', () => {
  describe('member leaves', () => {
    let owner, member, memberToken, family, goal;

    beforeAll(async () => {
      owner = await createTestUser({ name: 'Reassign Owner' });
      family = await createTestFamily(owner.id);
      await prisma.user.update({ where: { id: owner.id }, data: { family_id: family.id } });
      await prisma.familyMember.create({ data: { user_id: owner.id, family_id: family.id } });

      member = await createTestUser({ name: 'Reassign Member' });
      memberToken = generateToken(member.id);
      await prisma.user.update({ where: { id: member.id }, data: { family_id: family.id } });
      await prisma.familyMember.create({ data: { user_id: member.id, family_id: family.id } });

      goal = await makeFamilyGoal(member.id, family.id, 'Shared trip');
    });

    afterAll(async () => {
      await prisma.goal.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
      await prisma.familyMember.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
      await cleanupUser(member?.id);
      await cleanupUser(owner?.id);
      await cleanupFamily(family?.id);
    });

    test('family goal is reassigned to the owner', async () => {
      const res = await request(app)
        .post('/api/auth/family/leave')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(200);

      const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
      expect(updated.user_id).toBe(owner.id);
      expect(updated.family_id).toBe(family.id);
    });
  });

  describe('owner removes member', () => {
    let owner, ownerToken, member, family, goal;

    beforeAll(async () => {
      owner = await createTestUser({ name: 'Reassign Owner2' });
      ownerToken = generateToken(owner.id);
      family = await createTestFamily(owner.id);
      await prisma.user.update({ where: { id: owner.id }, data: { family_id: family.id } });
      await prisma.familyMember.create({ data: { user_id: owner.id, family_id: family.id } });

      member = await createTestUser({ name: 'Reassign Member2' });
      await prisma.user.update({ where: { id: member.id }, data: { family_id: family.id } });
      await prisma.familyMember.create({ data: { user_id: member.id, family_id: family.id } });

      goal = await makeFamilyGoal(member.id, family.id, 'Shared car');
    });

    afterAll(async () => {
      await prisma.goal.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
      await prisma.familyMember.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
      await cleanupUser(member?.id);
      await cleanupUser(owner?.id);
      await cleanupFamily(family?.id);
    });

    test('removed member family goal is reassigned to the owner', async () => {
      const res = await request(app)
        .delete(`/api/auth/family/members/${member.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(204);

      const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
      expect(updated.user_id).toBe(owner.id);
    });
  });
});
