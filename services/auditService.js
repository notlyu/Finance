const prisma = require('../lib/prisma-client');

const SENSITIVE_FIELDS = ['password', 'password_hash', 'token', 'secret', 'key'];

function maskSensitiveData(obj) {
  if (!obj) return obj;
  const masked = { ...obj };
  for (const field of SENSITIVE_FIELDS) {
    if (masked[field]) {
      masked[field] = '***MASKED***';
    }
  }
  return masked;
}

async function logAction(userId, action, entityType, entityId, changes = null, metadata = null, request = null) {
  try {
    const ipAddress = request?.ip || request?.connection?.remoteAddress || null;
    const userAgent = request?.get?.('User-Agent') || null;

    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes: changes ? maskSensitiveData(changes) : null,
        metadata: metadata ? maskSensitiveData(metadata) : null,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

async function logTransaction(userId, action, transactionId, oldData, newData, request = null) {
  const changes = {
    before: oldData ? {
      amount: oldData.amount,
      type: oldData.type,
      category_id: oldData.category_id,
      comment: oldData.comment,
      date: oldData.date,
    } : null,
    after: newData ? {
      amount: newData.amount,
      type: newData.type,
      category_id: newData.category_id,
      comment: newData.comment,
      date: newData.date,
    } : null,
  };
  return logAction(userId, action, 'transaction', transactionId, changes, null, request);
}

async function logGoal(userId, action, goalId, oldData, newData, request = null) {
  const changes = {
    before: oldData ? {
      name: oldData.name,
      target_amount: oldData.target_amount,
      current_amount: oldData.current_amount,
      deadline: oldData.deadline,
    } : null,
    after: newData ? {
      name: newData.name,
      target_amount: newData.target_amount,
      current_amount: newData.current_amount,
      deadline: newData.deadline,
    } : null,
  };
  return logAction(userId, action, 'goal', goalId, changes, null, request);
}

async function logWish(userId, action, wishId, oldData, newData, request = null) {
  const changes = {
    before: oldData ? {
      name: oldData.name,
      cost: oldData.cost,
      saved_amount: oldData.saved_amount,
      status: oldData.status,
    } : null,
    after: newData ? {
      name: newData.name,
      cost: newData.cost,
      saved_amount: newData.saved_amount,
      status: newData.status,
    } : null,
  };
  return logAction(userId, action, 'wish', wishId, changes, null, request);
}

async function logBudget(userId, action, budgetId, oldData, newData, request = null) {
  const changes = {
    before: oldData ? {
      limit_amount: oldData.limit_amount,
      category_id: oldData.category_id,
      month: oldData.month,
    } : null,
    after: newData ? {
      limit_amount: newData.limit_amount,
      category_id: newData.category_id,
      month: newData.month,
    } : null,
  };
  return logAction(userId, action, 'budget', budgetId, changes, null, request);
}

async function logAuth(userId, action, metadata, request = null) {
  return logAction(userId, action, 'auth', null, null, metadata, request);
}

async function logFamily(userId, action, familyId, changes, request = null) {
  return logAction(userId, action, 'family', familyId, changes, null, request);
}

async function getAuditLogs(userId, options = {}) {
  const { entityType, entityId, action, limit = 100, offset = 0 } = options;

  const where = {};
  if (entityType) where.entity_type = entityType;
  if (entityId) where.entity_id = entityId;
  if (action) where.action = action;

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { rows, total };
}

module.exports = {
  logAction,
  logTransaction,
  logGoal,
  logWish,
  logBudget,
  logAuth,
  logFamily,
  getAuditLogs,
  maskSensitiveData,
};
