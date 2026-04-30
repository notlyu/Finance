const prisma = require('../lib/prisma-client');

const getUserRole = async (userId, familyId) => {
  if (!familyId) return null;
  
  const member = await prisma.familyMember.findUnique({
    where: {
      user_id_family_id: { user_id: userId, family_id: familyId }
    }
  });
  
  return member?.role || 'MEMBER';
};

const hasPermission = async (userId, familyId, requiredRoles = ['OWNER', 'ADMIN']) => {
  const role = await getUserRole(userId, familyId);
  if (!role) return false;
  
  return requiredRoles.includes(role);
};

const setUserRole = async (targetUserId, familyId, newRole) => {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) throw new Error('Семья не найдена');
  
  const currentOwnerRole = await getUserRole(family.owner_user_id, familyId);
  if (currentOwnerRole !== 'OWNER') {
    throw new Error('Только владелец может изменять роли');
  }
  
  return prisma.familyMember.upsert({
    where: {
      user_id_family_id: { user_id: targetUserId, family_id: familyId }
    },
    create: {
      user_id: targetUserId,
      family_id: familyId,
      role: newRole,
    },
    update: {
      role: newRole,
    },
  });
};

const removeMember = async (userId, familyId) => {
  return prisma.familyMember.delete({
    where: {
      user_id_family_id: { user_id: userId, family_id: familyId }
    }
  }).catch(() => null);
};

const getFamilyMembers = async (familyId) => {
  return prisma.familyMember.findMany({
    where: { family_id: familyId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

const assignInitialRole = async (userId, familyId) => {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  const role = family?.owner_user_id === userId ? 'OWNER' : 'MEMBER';
  
  return prisma.familyMember.upsert({
    where: {
      user_id_family_id: { user_id: userId, family_id: familyId }
    },
    create: {
      user_id: userId,
      family_id: familyId,
      role,
    },
    update: {
      role,
    },
  });
};

const FORBIDDEN_ACTIONS = {
  VIEWER: ['transactions.create', 'transactions.update', 'transactions.delete', 'goals.create', 'goals.update', 'goals.delete', 'wishes.create', 'wishes.update', 'wishes.delete', 'budgets.create', 'budgets.update', 'budgets.delete'],
  MEMBER: ['transactions.delete', 'goals.delete', 'wishes.delete', 'budgets.delete', 'family.invite', 'family.remove'],
  ADMIN: ['family.remove'],
};

const canPerform = async (userId, familyId, action) => {
  const role = await getUserRole(userId, familyId);
  if (!role) return false;
  
  if (role === 'OWNER') return true;
  
  const forbidden = FORBIDDEN_ACTIONS[role] || [];
  return !forbidden.includes(action);
};

module.exports = {
  getUserRole,
  hasPermission,
  setUserRole,
  removeMember,
  getFamilyMembers,
  assignInitialRole,
  canPerform,
};