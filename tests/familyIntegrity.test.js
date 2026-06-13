const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const {
  createTestUser, generateToken, createTestFamily,
  cleanupUser, cleanupFamily,
} = require('./helpers');

// Регрессия на багфиксы целостности «семьи» (ТЗ — Логика семьи, этап F2):
// - осиротевшие FamilyMember при leave/remove (блокируют повторное вступление)
// - createFamily атомарность + запись участника-владельца
// - transferOwnership синхронизация ролей

async function makeInvite(familyId, createdBy) {
  // joinFamily требует ровно 10 символов и приводит код к upper-case.
  const code = (Date.now().toString(36) + Math.random().toString(36).slice(2))
    .toUpperCase().slice(0, 10).padEnd(10, 'X');
  await prisma.familyInvite.create({
    data: { family_id: familyId, created_by: createdBy, code, expires_at: new Date(Date.now() + 86400000) },
  });
  return code;
}

describe('Family integrity (F2)', () => {
  describe('createFamily', () => {
    let user, token, createdFamilyId;

    beforeAll(async () => {
      user = await createTestUser({ name: 'Create Owner' });
      token = generateToken(user.id);
    });

    afterAll(async () => {
      if (createdFamilyId) await cleanupFamily(createdFamilyId);
      await cleanupUser(user?.id);
    });

    test('creates family + FamilyMember row + owner_user_id atomically', async () => {
      const res = await request(app)
        .post('/api/auth/family/create')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Integrity Family' });
      expect(res.status).toBe(201);
      createdFamilyId = res.body.id;

      const member = await prisma.familyMember.findUnique({
        where: { user_id_family_id: { user_id: user.id, family_id: createdFamilyId } },
      });
      expect(member).not.toBeNull();

      const fam = await prisma.family.findUnique({ where: { id: createdFamilyId } });
      expect(fam.owner_user_id).toBe(user.id);
    });
  });

  describe('leave → re-join the same family', () => {
    let owner, ownerToken, member, memberToken, family;

    beforeAll(async () => {
      owner = await createTestUser({ name: 'ReJoin Owner' });
      ownerToken = generateToken(owner.id);
      family = await createTestFamily(owner.id);
      await prisma.user.update({ where: { id: owner.id }, data: { family_id: family.id } });
      await prisma.familyMember.create({ data: { user_id: owner.id, family_id: family.id } });

      member = await createTestUser({ name: 'ReJoin Member' });
      memberToken = generateToken(member.id);
    });

    afterAll(async () => {
      await prisma.familyMember.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
      await cleanupUser(member?.id);
      await cleanupUser(owner?.id);
      await cleanupFamily(family?.id);
    });

    test('member can re-join after leaving (no orphaned FamilyMember)', async () => {
      // join #1
      const code1 = await makeInvite(family.id, owner.id);
      const join1 = await request(app)
        .post('/api/auth/family/join')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ inviteCode: code1 });
      expect(join1.status).toBe(200);

      // leave
      const leave = await request(app)
        .post('/api/auth/family/leave')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(leave.status).toBe(200);

      // FamilyMember row must be gone
      const orphan = await prisma.familyMember.findUnique({
        where: { user_id_family_id: { user_id: member.id, family_id: family.id } },
      });
      expect(orphan).toBeNull();

      // join #2 — must succeed (previously failed on @@unique([user_id, family_id]))
      const code2 = await makeInvite(family.id, owner.id);
      const join2 = await request(app)
        .post('/api/auth/family/join')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ inviteCode: code2 });
      expect(join2.status).toBe(200);
    });
  });

  describe('removeFamilyMember', () => {
    let owner, ownerToken, member, family;

    beforeAll(async () => {
      owner = await createTestUser({ name: 'Remove Owner' });
      ownerToken = generateToken(owner.id);
      family = await createTestFamily(owner.id);
      await prisma.user.update({ where: { id: owner.id }, data: { family_id: family.id } });
      await prisma.familyMember.create({ data: { user_id: owner.id, family_id: family.id } });

      member = await createTestUser({ name: 'Remove Member' });
      await prisma.user.update({ where: { id: member.id }, data: { family_id: family.id } });
      await prisma.familyMember.create({ data: { user_id: member.id, family_id: family.id } });
    });

    afterAll(async () => {
      await prisma.familyMember.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
      await cleanupUser(member?.id);
      await cleanupUser(owner?.id);
      await cleanupFamily(family?.id);
    });

    test('removing a member deletes the FamilyMember row', async () => {
      const res = await request(app)
        .delete(`/api/auth/family/members/${member.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(204);

      const row = await prisma.familyMember.findUnique({
        where: { user_id_family_id: { user_id: member.id, family_id: family.id } },
      });
      expect(row).toBeNull();
    });
  });

  describe('transferOwnership', () => {
    let owner, ownerToken, member, family;

    beforeAll(async () => {
      owner = await createTestUser({ name: 'Transfer Owner' });
      ownerToken = generateToken(owner.id);
      family = await createTestFamily(owner.id);
      await prisma.user.update({ where: { id: owner.id }, data: { family_id: family.id } });
      await prisma.familyMember.create({ data: { user_id: owner.id, family_id: family.id } });

      member = await createTestUser({ name: 'Transfer Member' });
      await prisma.user.update({ where: { id: member.id }, data: { family_id: family.id } });
      await prisma.familyMember.create({ data: { user_id: member.id, family_id: family.id } });
    });

    afterAll(async () => {
      await prisma.familyMember.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
      await cleanupUser(member?.id);
      await cleanupUser(owner?.id);
      await cleanupFamily(family?.id);
    });

    test('transfer updates family.owner_user_id', async () => {
      const res = await request(app)
        .post('/api/auth/family/transfer-ownership')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newOwnerId: member.id });
      expect(res.status).toBe(200);

      const updated = await prisma.family.findUnique({ where: { id: family.id } });
      expect(updated.owner_user_id).toBe(member.id);

      // обе записи участников остаются (роли удалены — владелец только через owner_user_id)
      const newOwner = await prisma.familyMember.findUnique({
        where: { user_id_family_id: { user_id: member.id, family_id: family.id } },
      });
      const oldOwner = await prisma.familyMember.findUnique({
        where: { user_id_family_id: { user_id: owner.id, family_id: family.id } },
      });
      expect(newOwner).not.toBeNull();
      expect(oldOwner).not.toBeNull();
    });
  });
});
