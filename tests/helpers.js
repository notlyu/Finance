const prisma = require('../lib/prisma-client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function createTestUser(overrides = {}) {
  const passwordHash = await bcrypt.hash('Test1234!$', 10);
  return prisma.user.create({
    data: {
      email: `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`,
      password_hash: passwordHash,
      name: 'Test User',
      ...overrides,
    }
  });
}

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
}

async function createTestFamily(ownerUserId, overrides = {}) {
  const code = `T${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  return prisma.family.create({
    data: {
      name: 'Test Family',
      invite_code: code,
      owner_user_id: ownerUserId,
      ...overrides,
    }
  });
}

async function createTestCategory(overrides = {}) {
  return prisma.category.create({
    data: {
      name: 'Test Category',
      type: 'expense',
      ...overrides,
    }
  });
}

async function createTestAccount(userId, overrides = {}) {
  return prisma.account.create({
    data: {
      name: 'Test Account',
      type: 'debit',
      balance: 0,
      user_id: userId,
      ...overrides,
    }
  });
}

async function createTestTransaction(userId, overrides = {}) {
  return prisma.transaction.create({
    data: {
      type: 'expense',
      amount: 1000,
      date: new Date().toISOString().slice(0, 10),
      user_id: userId,
      ...overrides,
    }
  });
}

async function cleanupUser(userId) {
  if (!userId) return;
  await prisma.goalContribution.deleteMany({ where: { goal: { user_id: userId } } }).catch(() => {});
  await prisma.wishContribution.deleteMany({ where: { wish: { user_id: userId } } }).catch(() => {});
  await prisma.goal.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.wish.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.transaction.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.budget.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.recurringTransaction.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.debt.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.notification.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.notificationSetting.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.safetyPillowSetting.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.safetyPillowSnapshot.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.userWidgetConfig.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.safetyPillowHistory.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.passwordResetToken.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.account.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.category.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.familyMember.deleteMany({ where: { user_id: userId } }).catch(() => {});
  await prisma.familyInvite.deleteMany({ where: { family: { owner_user_id: userId } } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

async function cleanupFamily(familyId) {
  if (!familyId) return;
  await prisma.familyMember.deleteMany({ where: { family_id: familyId } }).catch(() => {});
  await prisma.familyInvite.deleteMany({ where: { family_id: familyId } }).catch(() => {});
  await prisma.familySettings.deleteMany({ where: { family_id: familyId } }).catch(() => {});
  await prisma.family.delete({ where: { id: familyId } }).catch(() => {});
}

module.exports = {
  createTestUser,
  generateToken,
  createTestFamily,
  createTestCategory,
  createTestAccount,
  createTestTransaction,
  cleanupUser,
  cleanupFamily,
};
