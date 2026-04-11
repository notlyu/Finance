const prisma = require('./prisma');

function addUpdateMethod(instance, modelName) {
  if (instance && typeof instance === 'object') {
    instance.update = async function(data) {
      const id = this.id;
      const modelKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      return prisma[modelKey].update({
        where: { id },
        data,
      });
    };
    instance.destroy = async function() {
      const id = this.id;
      const modelKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      return prisma[modelKey].delete({ where: { id } });
    };
  }
  return instance;
}

// Адаптер для упрощения перехода с Sequelize на Prisma
// eslint-disable-next-line no-unused-vars
const { Op } = {
  and: (conditions) => conditions,
  or: (conditions) => conditions,
  gt: (val) => ({ gt: val }),
  gte: (val) => ({ gte: val }),
  lt: (val) => ({ lt: val }),
  lte: (val) => ({ lte: val }),
  eq: (val) => val,
  ne: (val) => ({ not: val }),
  in: (val) => ({ in: val }),
  between: (val1, val2) => ({ gte: val1, lte: val2 }),
  notIn: (val) => ({ notIn: val }),
};

// Функция для преобразования where условий Sequelize в Prisma
function parseWhere(where, model) {
  const result = {};
  
  // Handle OR/or at the top level (before iterating)
  if (where && typeof where === 'object' && (where.or || where.OR)) {
    const orConditions = Array.isArray(where.or || where.OR) ? where.or || where.OR : [where.or || where.OR];
    const parsedOr = orConditions.map(cond => parseWhere(cond, model));
    // Remove 'or'/'OR' from the iteration - create clean copy
    const { or, OR, ...restWhere } = where;
    where = restWhere;
    result.OR = parsedOr;
  }
  
  for (const [key, value] of Object.entries(where || {})) {
    if (value === null) {
      result[key] = null;
    } else if (typeof value === 'object' && value !== undefined) {
      // Handle Op cases
      if (value.and || value.AND) {
        result.AND = parseWhere({ ...(value.and || value.AND) }, model);
      } else if (value.or || value.OR) {
        const orValue = value.or || value.OR;
        result.OR = (result.OR || []).concat(
          Array.isArray(orValue) 
            ? orValue.map(w => parseWhere(w, model))
            : [parseWhere(orValue, model)]
        );
      } else if (value.gt !== undefined) {
        result[key] = { gt: value.gt };
      } else if (value.gte !== undefined) {
        result[key] = { gte: value.gte };
      } else if (value.lt !== undefined) {
        result[key] = { lt: value.lt };
      } else if (value.lte !== undefined) {
        result[key] = { lte: value.lte };
      } else if (value.in) {
        result[key] = { in: value.in };
      } else if (value.notIn) {
        result[key] = { notIn: value.notIn };
      } else if (value.not) {
        result[key] = { not: value.not };
      } else if (value.gte && value.lte) {
        result[key] = { gte: value.gte, lte: value.lte };
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// Модели с интерфейсом Sequelize-подобным
const models = {
  User: {
    findOne: async (options) => {
      const where = parseWhere(options.where || {}, 'User');
      const result = await prisma.user.findFirst({
        where,
        include: options.include ? parseInclude(options.include) : undefined,
      });
      const transformed = result ? transformIncludeResult(result, options.include) : result;
      return transformed ? addUpdateMethod(transformed, 'User') : transformed;
    },
    findByPk: async (id, options = {}) => {
      const result = await prisma.user.findUnique({
        where: { id },
        include: options?.include ? parseInclude(options.include) : undefined,
      });
      const transformed = result ? transformIncludeResult(result, options?.include) : result;
      return transformed ? addUpdateMethod(transformed, 'User') : transformed;
    },
    create: async (data) => {
      const result = await prisma.user.create({ data });
      const formatted = {
        id: result.id,
        email: result.email,
        password_hash: result.password_hash,
        name: result.name,
        family_id: result.family_id,
        created_at: result.created_at,
      };
      return addUpdateMethod(formatted, 'User');
    },
    update: async (options) => {
      const { where, ...rest } = options;
      return prisma.user.update({
        where: parseWhere(where, 'User'),
        data: rest,
      });
    },
    destroy: async (options) => {
      const where = parseWhere(options.where || {}, 'User');
      return prisma.user.delete({ where });
    },
    findAll: async (options = {}) => {
      const { where, order, limit, offset, include } = options;
      return prisma.user.findMany({
        where: where ? parseWhere(where, 'User') : undefined,
        orderBy: order ? parseOrder(order) : undefined,
        take: limit,
        skip: offset,
        include: include ? parseInclude(include) : undefined,
      });
    },
    count: async (options = {}) => {
      const where = parseWhere(options.where || {}, 'User');
      return prisma.user.count({ where });
    },
  },
  Family: {
    findOne: async (options) => {
      const where = parseWhere(options.where || {}, 'Family');
      const result = await prisma.family.findFirst({
        where,
        include: options.include ? parseInclude(options.include) : undefined,
      });
      const transformed = result ? transformIncludeResult(result, options.include) : result;
      return transformed ? addUpdateMethod(transformed, 'Family') : transformed;
    },
    findByPk: async (id, options = {}) => {
      const result = await prisma.family.findUnique({ 
        where: { id },
        include: options?.include ? parseInclude(options.include) : undefined,
      });
      const transformed = result ? transformIncludeResult(result, options?.include) : result;
      return transformed ? addUpdateMethod(transformed, 'Family') : transformed;
    },
    create: (data) => {
      const result = prisma.family.create({ data });
      return result.then(r => addUpdateMethod(r, 'Family'));
    },
    update: async (options) => {
      const { where, ...rest } = options;
      return prisma.family.update({
        where: parseWhere(where, 'Family'),
        data: rest,
      });
    },
    destroy: async (options) => {
      const where = parseWhere(options.where || {}, 'Family');
      return prisma.family.delete({ where });
    },
    findAll: async (options = {}) => {
      const { where, order, limit, offset, include } = options;
      return prisma.family.findMany({
        where: where ? parseWhere(where, 'Family') : undefined,
        orderBy: order ? parseOrder(order) : undefined,
        take: limit,
        skip: offset,
        include: include ? parseInclude(include) : undefined,
      });
    },
    countMembers: async function(familyId) {
      return prisma.user.count({ where: { family_id: familyId } });
    },
  },
  Transaction: {
    findOne: async (options) => {
      const where = parseWhere(options.where || {}, 'Transaction');
      return prisma.transaction.findFirst({ where });
    },
    findByPk: async (id) => prisma.transaction.findUnique({ where: { id } }),
    create: (data) => {
      const createData = { ...data };
      if (createData.date) {
        createData.date = new Date(createData.date);
      }
      if (createData.amount) {
        createData.amount = Number(createData.amount);
      }
      if (createData.category_id) {
        createData.category_id = Number(createData.category_id);
      }
      return prisma.transaction.create({ data: createData });
    },
    update: async (options) => {
      const { where, ...rest } = options;
      const updateData = { ...rest };
      if (updateData.date) {
        updateData.date = new Date(updateData.date);
      }
      if (updateData.amount) {
        updateData.amount = Number(updateData.amount);
      }
      if (updateData.category_id) {
        updateData.category_id = Number(updateData.category_id);
      }
      return prisma.transaction.update({
        where: parseWhere(where, 'Transaction'),
        data: updateData,
      });
    },
    destroy: async (options) => {
      const where = parseWhere(options.where || {}, 'Transaction');
      return prisma.transaction.delete({ where });
    },
    findAll: async (options = {}) => {
      const { where, order, limit, offset, include } = options;
      return prisma.transaction.findMany({
        where: where ? parseWhere(where, 'Transaction') : undefined,
        orderBy: order ? parseOrder(order) : undefined,
        take: limit,
        skip: offset,
        include: include ? parseInclude(include) : undefined,
      });
    },
    count: async (options = {}) => {
      const where = parseWhere(options.where || {}, 'Transaction');
      return prisma.transaction.count({ where });
    },
    findAndCountAll: async (options = {}) => {
      const { where, order, limit, offset, include } = options;
      const items = await prisma.transaction.findMany({
        where: where ? parseWhere(where, 'Transaction') : undefined,
        orderBy: order ? parseOrder(order) : undefined,
        take: limit,
        skip: offset,
        include: include ? parseInclude(include) : undefined,
      });
      const total = await prisma.transaction.count({
        where: where ? parseWhere(where, 'Transaction') : undefined,
      });
      return { rows: items, count: total };
    },
  },
  Category: {
    findOne: async (options) => {
      const where = parseWhere(options.where || {}, 'Category');
      const result = await prisma.category.findFirst({ 
        where,
        include: options.include ? parseInclude(options.include) : undefined,
      });
      return result ? addUpdateMethod(result, 'Category') : result;
    },
    findByPk: async (id, options = {}) => {
      const result = await prisma.category.findUnique({ 
        where: { id },
        include: options?.include ? parseInclude(options.include) : undefined,
      });
      return result ? addUpdateMethod(result, 'Category') : result;
    },
    create: (data) => prisma.category.create({ data }),
    update: async (options) => {
      const { where, ...rest } = options;
      return prisma.category.update({
        where: parseWhere(where, 'Category'),
        data: rest,
      });
    },
    destroy: async (options) => {
      const where = parseWhere(options.where || {}, 'Category');
      return prisma.category.delete({ where });
    },
    findAll: async (options = {}) => {
      const { where, order, limit, offset, include } = options;
      return prisma.category.findMany({
        where: where ? parseWhere(where, 'Category') : undefined,
        orderBy: order ? parseOrder(order) : undefined,
        take: limit,
        skip: offset,
        include: include ? parseInclude(include) : undefined,
      });
    },
  },
  Goal: {
    findOne: async (options) => {
      const where = parseWhere(options.where || {}, 'Goal');
      return prisma.goal.findFirst({ where });
    },
    findByPk: async (id) => prisma.goal.findUnique({ where: { id } }),
    create: (data) => prisma.goal.create({ data }),
    update: async (options) => {
      const { where, ...rest } = options;
      return prisma.goal.update({
        where: parseWhere(where, 'Goal'),
        data: rest,
      });
    },
    destroy: async (options) => {
      const where = parseWhere(options.where || {}, 'Goal');
      return prisma.goal.delete({ where });
    },
    findAll: async (options = {}) => {
      const { where, order, limit, offset, include } = options;
      return prisma.goal.findMany({
        where: where ? parseWhere(where, 'Goal') : undefined,
        orderBy: order ? parseOrder(order) : undefined,
        take: limit,
        skip: offset,
        include: include ? parseInclude(include) : undefined,
      });
    },
  },
  Wish: {
    findOne: async (options) => {
      const where = parseWhere(options.where || {}, 'Wish');
      return prisma.wish.findFirst({ where });
    },
    findByPk: async (id) => prisma.wish.findUnique({ where: { id } }),
    create: (data) => prisma.wish.create({ data }),
    update: async (options) => {
      const { where, ...rest } = options;
      return prisma.wish.update({
        where: parseWhere(where, 'Wish'),
        data: rest,
      });
    },
    destroy: async (options) => {
      const where = parseWhere(options.where || {}, 'Wish');
      return prisma.wish.delete({ where });
    },
    findAll: async (options = {}) => {
      const { where, order, limit, offset, include } = options;
      return prisma.wish.findMany({
        where: where ? parseWhere(where, 'Wish') : undefined,
        orderBy: order ? parseOrder(order) : undefined,
        take: limit,
        skip: offset,
        include: include ? parseInclude(include) : undefined,
      });
    },
  },
  Budget: {
    findOne: async (options) => {
      const where = parseWhere(options.where || {}, 'Budget');
      return prisma.budget.findFirst({ where });
    },
    findByPk: async (id) => prisma.budget.findUnique({ where: { id } }),
    create: (data) => prisma.budget.create({ data }),
    update: async (options) => {
      const { where, ...rest } = options;
      return prisma.budget.update({
        where: parseWhere(where, 'Budget'),
        data: rest,
      });
    },
    destroy: async (options) => {
      const where = parseWhere(options.where || {}, 'Budget');
      return prisma.budget.delete({ where });
    },
    findAll: async (options = {}) => {
      const { where, order, limit, offset } = options;
      return prisma.budget.findMany({
        where: where ? parseWhere(where, 'Budget') : undefined,
        orderBy: order ? parseOrder(order) : undefined,
        take: limit,
        skip: offset,
      });
    },
  },
  RecurringTransaction: {
    findOne: async (options) => {
      const where = parseWhere(options.where || {}, 'RecurringTransaction');
      const result = await prisma.recurringTransaction.findFirst({ 
        where,
        include: options.include ? parseInclude(options.include) : undefined,
      });
      return result ? addUpdateMethod(result, 'RecurringTransaction') : result;
    },
    findByPk: async (id, options = {}) => {
      const result = await prisma.recurringTransaction.findUnique({ 
        where: { id },
        include: options?.include ? parseInclude(options.include) : undefined,
      });
      return result ? addUpdateMethod(result, 'RecurringTransaction') : result;
    },
    create: (data) => {
      const result = prisma.recurringTransaction.create({ data });
      return result.then(r => addUpdateMethod(r, 'RecurringTransaction'));
    },
    update: async (options) => {
      const { where, ...rest } = options;
      return prisma.recurringTransaction.update({
        where: parseWhere(where, 'RecurringTransaction'),
        data: rest,
      });
    },
    destroy: async (options) => {
      const where = parseWhere(options.where || {}, 'RecurringTransaction');
      return prisma.recurringTransaction.delete({ where });
    },
    findAll: async (options = {}) => {
      const { where, order, limit, offset, include } = options;
      return prisma.recurringTransaction.findMany({
        where: where ? parseWhere(where, 'RecurringTransaction') : undefined,
        orderBy: order ? parseOrder(order) : undefined,
        take: limit,
        skip: offset,
        include: include ? parseInclude(include) : undefined,
      });
    },
  },
  FamilyInvite: {
    findOne: async (options) => {
      const where = parseWhere(options.where || {}, 'FamilyInvite');
      const result = await prisma.familyInvite.findFirst({
        where,
        include: options.include ? parseInclude(options.include) : undefined,
      });
      return result ? addUpdateMethod(result, 'FamilyInvite') : result;
    },
    findByPk: async (id) => {
      const result = await prisma.familyInvite.findUnique({ where: { id } });
      return result ? addUpdateMethod(result, 'FamilyInvite') : result;
    },
    create: (data) => {
      const result = prisma.familyInvite.create({ data });
      return result.then(r => addUpdateMethod(r, 'FamilyInvite'));
    },
    destroy: async (options) => {
      const where = parseWhere(options.where || {}, 'FamilyInvite');
      return prisma.familyInvite.delete({ where });
    },
    findAll: async (options = {}) => {
      const { where, order, limit, offset } = options;
      return prisma.familyInvite.findMany({
        where: where ? parseWhere(where, 'FamilyInvite') : undefined,
        orderBy: order ? parseOrder(order) : undefined,
        take: limit,
        skip: offset,
      });
    },
  },
  SafetyPillowSetting: {
    findOne: async (options) => {
      const where = parseWhere(options.where || {}, 'SafetyPillowSetting');
      return prisma.safetyPillowSetting.findFirst({ where });
    },
    create: (data) => prisma.safetyPillowSetting.create({ data }),
    update: async (options) => {
      const { where, ...rest } = options;
      return prisma.safetyPillowSetting.update({
        where: parseWhere(where, 'SafetyPillowSetting'),
        data: rest,
      });
    },
  },
  SafetyPillowHistory: {
    findAll: async (options = {}) => {
      const { where, order, limit } = options;
      return prisma.safetyPillowHistory.findMany({
        where: where ? parseWhere(where, 'SafetyPillowHistory') : undefined,
        orderBy: order ? parseOrder(order) : undefined,
        take: limit,
      });
    },
    create: (data) => prisma.safetyPillowHistory.create({ data }),
  },
  PasswordResetToken: {
    findOne: async (options) => {
      const where = parseWhere(options.where || {}, 'PasswordResetToken');
      return prisma.passwordResetToken.findFirst({ where });
    },
    create: (data) => prisma.passwordResetToken.create({ data }),
    destroy: async (options) => {
      const where = parseWhere(options.where || {}, 'PasswordResetToken');
      return prisma.passwordResetToken.delete({ where });
    },
  },
  Notification: {
    findAll: async (options = {}) => {
      const { where, order, limit, offset } = options;
      return prisma.notification.findMany({
        where: where ? parseWhere(where, 'Notification') : undefined,
        orderBy: order ? parseOrder(order) : undefined,
        take: limit,
        skip: offset,
      });
    },
    count: async (options = {}) => {
      const { where } = options;
      return prisma.notification.count({
        where: where ? parseWhere(where, 'Notification') : undefined,
      });
    },
    findAndCountAll: async (options = {}) => {
      const { where, order, limit, offset } = options;
      const [items, total] = await Promise.all([
        prisma.notification.findMany({
          where: where ? parseWhere(where, 'Notification') : undefined,
          orderBy: order ? parseOrder(order) : undefined,
          take: limit,
          skip: offset,
        }),
        prisma.notification.count({
          where: where ? parseWhere(where, 'Notification') : undefined,
        }),
      ]);
      return { rows: items, count: total };
    },
    create: (data) => prisma.notification.create({ data }),
    update: async (options) => {
      const { where, ...rest } = options;
      return prisma.notification.update({
        where: parseWhere(where, 'Notification'),
        data: rest,
      });
    },
  },
  GoalContribution: {
    create: (data) => prisma.goalContribution.create({ data }),
    findAll: async (options = {}) => {
      const { where } = options;
      return prisma.goalContribution.findMany({
        where: where ? parseWhere(where, 'GoalContribution') : undefined,
      });
    },
  },
  WishContribution: {
    create: (data) => prisma.wishContribution.create({ data }),
    findAll: async (options = {}) => {
      const { where } = options;
      return prisma.wishContribution.findMany({
        where: where ? parseWhere(where, 'WishContribution') : undefined,
      });
    },
  },
  NotificationSetting: {
    findOne: async (options) => {
      const where = parseWhere(options.where || {}, 'NotificationSetting');
      return prisma.notificationSetting.findFirst({ where });
    },
    create: (data) => prisma.notificationSetting.create({ data }),
    update: async (options) => {
      const { where, ...rest } = options;
      return prisma.notificationSetting.update({
        where: parseWhere(where, 'NotificationSetting'),
        data: rest,
      });
    },
  },
};

function parseOrder(order) {
  if (!order) return undefined;
  
  if (Array.isArray(order)) {
    return order.map(([key, direction]) => ({
      [key]: direction.toLowerCase(),
    }));
  }
  
  return Object.entries(order).reduce((acc, [key, direction]) => {
    acc[key] = direction.toLowerCase();
    return acc;
  }, {});
}

function parseInclude(include) {
  if (!include) return undefined;
  
  const includes = Array.isArray(include) ? include : [include];
  const result = {};
  
  for (const item of includes) {
    if (typeof item === 'string') {
      const key = item.charAt(0).toLowerCase() + item.slice(1);
      result[key] = true;
    } else if (item.model || item.as) {
      const alias = item.as || item.model?.name?.charAt(0).toLowerCase() + item.model?.name?.slice(1);
      const key = alias.charAt(0).toLowerCase() + alias.slice(1);
      result[key] = true;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function transformIncludeResult(result, include) {
  if (!result || !include) return result;
  
  const includes = Array.isArray(include) ? include : [include];
  
  for (const item of includes) {
    const alias = item.as || (item.model ? item.model.name : null);
    if (alias) {
      const key = alias.charAt(0).toLowerCase() + alias.slice(1);
      if (result[key] !== undefined && alias !== key) {
        result[alias] = result[key];
      }
    }
  }
  
  return result;
}

module.exports = { 
  models, 
  Op, 
  prisma,
  // Direct exports for convenience
  User: models.User,
  Family: models.Family,
  Transaction: models.Transaction,
  Category: models.Category,
  Goal: models.Goal,
  Wish: models.Wish,
  Budget: models.Budget,
  RecurringTransaction: models.RecurringTransaction,
  FamilyInvite: models.FamilyInvite,
  SafetyPillowSetting: models.SafetyPillowSetting,
  SafetyPillowHistory: models.SafetyPillowHistory,
  PasswordResetToken: models.PasswordResetToken,
  Notification: models.Notification,
  NotificationSetting: models.NotificationSetting,
  GoalContribution: models.GoalContribution,
  WishContribution: models.WishContribution,
};