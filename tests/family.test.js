const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { createTestUser, generateToken, createTestFamily, cleanupUser, cleanupFamily } = require('./helpers');

let owner, ownerToken, member, memberToken, testFamily, soloUser, soloToken;

beforeAll(async () => {
  owner = await createTestUser({ name: 'Family Owner' });
  ownerToken = generateToken(owner.id);
  testFamily = await createTestFamily(owner.id);
  await prisma.user.update({ where: { id: owner.id }, data: { family_id: testFamily.id } });
  await prisma.familyMember.create({ data: { user_id: owner.id, family_id: testFamily.id, role: 'OWNER' } }).catch(() => {});

  member = await createTestUser({ name: 'Family Member' });
  memberToken = generateToken(member.id);
  await prisma.user.update({ where: { id: member.id }, data: { family_id: testFamily.id } });
  await prisma.familyMember.create({ data: { user_id: member.id, family_id: testFamily.id, role: 'MEMBER' } }).catch(() => {});

  soloUser = await createTestUser({ name: 'Solo User' });
  soloToken = generateToken(soloUser.id);
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

describe('Family', () => {
  describe('POST /api/auth/family/create', () => {
    test('creates a family', async () => {
      const res = await request(app)
        .post('/api/auth/family/create')
        .set('Authorization', `Bearer ${soloToken}`)
        .send({ name: 'New Test Family' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('New Test Family');

      await prisma.familyMember.deleteMany({ where: { family_id: res.body.id } });
      await prisma.user.update({ where: { id: soloUser.id }, data: { family_id: null } });
      await prisma.family.delete({ where: { id: res.body.id } }).catch(() => {});
    });

    test('returns 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/auth/family/create')
        .set('Authorization', `Bearer ${soloToken}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/family/join', () => {
    test('joins with valid invite code', async () => {
      const code = `T${Date.now()}J`.slice(0, 10);
      await prisma.family.update({ where: { id: testFamily.id }, data: { invite_code: code } });
      await prisma.familyInvite.create({
        data: { family_id: testFamily.id, created_by: owner.id, code, expires_at: new Date(Date.now() + 86400000) }
      });

      const res = await request(app)
        .post('/api/auth/family/join')
        .set('Authorization', `Bearer ${soloToken}`)
        .send({ inviteCode: code });
      expect(res.status).toBe(200);
      expect(res.body.family_id).toBe(testFamily.id);

      await prisma.user.update({ where: { id: soloUser.id }, data: { family_id: null } });
    });

    test('returns 400 for invalid invite code', async () => {
      const res = await request(app)
        .post('/api/auth/family/join')
        .set('Authorization', `Bearer ${soloToken}`)
        .send({ inviteCode: 'INVALID9999' });
      expect(res.status).toBe(400);
    });

    test('returns 400 for missing code', async () => {
      const res = await request(app)
        .post('/api/auth/family/join')
        .set('Authorization', `Bearer ${soloToken}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/family/leave', () => {
    test('member can leave family', async () => {
      const leaver = await createTestUser({ name: 'Leaver', family_id: testFamily.id });
      const leaverToken = generateToken(leaver.id);

      const res = await request(app)
        .post('/api/auth/family/leave')
        .set('Authorization', `Bearer ${leaverToken}`);
      expect(res.status).toBe(200);

      await cleanupUser(leaver.id);
    });
  });

  describe('Family Invites', () => {
    test('POST /api/auth/family/invites creates invite', async () => {
      const res = await request(app)
        .post('/api/auth/family/invites')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('code');
    });

    test('GET /api/auth/family/invites lists invites', async () => {
      const res = await request(app)
        .get('/api/auth/family/invites')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('DELETE /api/auth/family/invites/:id revokes invite', async () => {
      const code = `R${Date.now()}V`.slice(0, 10);
      const invite = await prisma.familyInvite.create({
        data: { family_id: testFamily.id, created_by: owner.id, code, expires_at: new Date(Date.now() + 86400000) }
      });

      const res = await request(app)
        .delete(`/api/auth/family/invites/${invite.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(204);
    });
  });

  describe('POST /api/auth/family/transfer-ownership', () => {
    test('owner can transfer ownership', async () => {
      const res = await request(app)
        .post('/api/auth/family/transfer-ownership')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newOwnerId: member.id });
      expect(res.status).toBe(200);

      await prisma.family.update({ where: { id: testFamily.id }, data: { owner_user_id: owner.id } });
    });

    test('non-owner cannot transfer ownership', async () => {
      const res = await request(app)
        .post('/api/auth/family/transfer-ownership')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ newOwnerId: owner.id });
      expect(res.status).toBe(403);
    });

    test('returns 400 for missing newOwnerId', async () => {
      const res = await request(app)
        .post('/api/auth/family/transfer-ownership')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/auth/family/members/:memberId', () => {
    test('owner can remove member', async () => {
      const res = await request(app)
        .delete(`/api/auth/family/members/${member.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(204);

      await prisma.user.update({ where: { id: member.id }, data: { family_id: testFamily.id } });
    });

    test('non-owner cannot remove member', async () => {
      const res = await request(app)
        .delete(`/api/auth/family/members/${owner.id}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Family Settings', () => {
    test('GET /api/family-settings returns settings', async () => {
      const res = await request(app)
        .get('/api/family-settings')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
    });

    test('PATCH /api/family-settings updates settings', async () => {
      const res = await request(app)
        .patch('/api/family-settings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ show_personal_in_stats: true });
      expect(res.status).toBe(200);
    });

    test('returns 400 for invalid settings', async () => {
      const res = await request(app)
        .patch('/api/family-settings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ show_personal_in_stats: 'not_boolean' });
      expect(res.status).toBe(400);
    });
  });
});
