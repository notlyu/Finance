const prisma = require('../lib/prisma-client');
const { logger, NotFoundError, ValidationError } = require('../lib/errors');

function monthStartEnd(month) {
  const [y, m] = String(month).split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

exports.getBudgets = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const month = String(req.query.month || new Date().toISOString().slice(0, 7));
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new ValidationError('Некорректный month (ожидается YYYY-MM)');
    }

    const memberId = req.query.memberId ? Number(req.query.memberId) : null;

    const { start, end } = monthStartEnd(month);

    const startDate = new Date(start);
    const endDate = new Date(end);
    
    let txWhere = familyId
      ? { family_id: familyId, date: { gte: startDate, lt: endDate } }
      : { family_id: null, user_id: user.id, date: { gte: startDate, lt: endDate } };

    const privacyFilter = { OR: [{ is_private: false }, { user_id: user.id }] };
    txWhere = { ...txWhere, ...privacyFilter };

    if (memberId) {
      txWhere.user_id = memberId;
    }

    const budgetWhere = familyId
      ? { family_id: familyId, month }
      : { family_id: null, user_id: user.id, month };

    const budgets = await prisma.budget.findMany({
      where: budgetWhere,
      include: {
        category: { select: { id: true, name: true, type: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ type: 'asc' }, { limit_amount: 'desc' }],
    });

    const actuals = await prisma.transaction.groupBy({
      by: ['type', 'category_id', 'user_id'],
      where: txWhere,
      _sum: { amount: true },
    });

    const actualMap = new Map();
    for (const a of actuals) {
      const key = `${a.type}:${a.category_id}`;
      if (!actualMap.has(key)) actualMap.set(key, {});
      actualMap.get(key)[a.user_id] = Number(a._sum.amount || 0);
    }

    const memberContributions = {};
    const members = familyId
      ? await prisma.user.findMany({ where: { family_id: familyId }, select: { id: true, name: true } })
      : [{ id: user.id, name: user.name }];

    members.forEach(m => { memberContributions[m.id] = { name: m.name, amount: 0 }; });

    for (const a of actuals) {
      if (memberContributions[a.user_id]) {
        memberContributions[a.user_id].amount += Number(a._sum.amount || 0);
      }
    }

    const items = budgets.map(b => {
      const key = `${b.type}:${b.category_id}`;
      const byMember = actualMap.get(key) || {};
      const total = Object.values(byMember).reduce((s, v) => s + v, 0);
      const limit = Number(b.limit_amount || 0);
      return {
        id: b.id,
        month: b.month,
        type: b.type,
        category_id: b.category_id,
        category_name: b.category?.name || '',
        limit_amount: limit,
        actual_amount: total,
        progress: limit > 0 ? (total / limit) * 100 : 0,
        is_personal: b.is_personal,
        spent_by_members: members.map(m => ({
          userId: m.id,
          name: m.name,
          amount: byMember[m.id] || 0,
          percentage: total > 0 ? Math.round((byMember[m.id] || 0) / total * 100) : 0,
        })),
      };
    });

    logger.info({ userId: user.id, action: 'getBudgets', month });
    res.json({ month, items, memberContributions });
  } catch (error) {
    next(error);
  }
};

exports.createBudget = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const { month, type = 'expense', category_id, limit_amount, is_personal } = req.body;
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) {
      throw new ValidationError('Некорректный month (YYYY-MM)');
    }
    if (!['income', 'expense'].includes(type)) {
      throw new ValidationError('Некорректный type');
    }
    if (!category_id) {
      throw new ValidationError('category_id обязателен');
    }
    const limit = Number(limit_amount);
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new ValidationError('limit_amount должен быть > 0');
    }

    const isPersonalBudget = is_personal || !familyId;
    const budget = await prisma.budget.create({
      data: {
        family_id: isPersonalBudget ? null : familyId,
        user_id: user.id,
        category_id,
        month,
        type,
        limit_amount: limit,
        is_personal: isPersonalBudget,
      },
    });

    logger.info({ userId: user.id, budgetId: budget.id, action: 'createBudget' });
    res.status(201).json(budget);
  } catch (error) {
    next(error);
  }
};

exports.updateBudget = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const { id } = req.params;

    const budget = await prisma.budget.findFirst({
      where: familyId
        ? { id: Number(id), OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id: Number(id), family_id: null, user_id: user.id },
    });
    if (!budget) {
      throw new NotFoundError('Бюджет не найден');
    }

    const limit = Number(req.body.limit_amount);
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new ValidationError('limit_amount должен быть > 0');
    }

    const updated = await prisma.budget.update({
      where: { id: Number(id) },
      data: { limit_amount: limit, updated_at: new Date() },
    });

    logger.info({ userId: user.id, budgetId: budget.id, action: 'updateBudget' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteBudget = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const { id } = req.params;

    const budget = await prisma.budget.findFirst({
      where: familyId
        ? { id: Number(id), OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id: Number(id), family_id: null, user_id: user.id },
    });
    if (!budget) {
      throw new NotFoundError('Бюджет не найден');
    }

    await prisma.budget.delete({ where: { id: Number(id) } });

    logger.info({ userId: user.id, budgetId: budget.id, action: 'deleteBudget' });
    res.json({ message: 'Бюджет удалён' });
  } catch (error) {
    next(error);
  }
};