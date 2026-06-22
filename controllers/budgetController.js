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
    const q = req.validatedQuery || req.query;
    const period = q.period || 'month';
    const year = q.year;
    logger.info({ userId: user.id, familyId, period, year, month: q.month }, 'BUDGETS GET');

    const month = String(q.month || new Date().toISOString().slice(0, 7));
    if (period === 'month') {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new ValidationError('Некорректный month (ожидается YYYY-MM)');
      }
    } else if (period === 'year') {
      if (!year || !/^\d{4}$/.test(year)) {
        throw new ValidationError('Некорректный год (ожидается YYYY)');
      }
    }

    const memberId = q.memberId ? Number(q.memberId) : null;

    let items, memberContributions;
    
    if (period === 'year' && year) {
      const months = [];
      for (let m = 1; m <= 12; m++) {
        months.push(`${year}-${String(m).padStart(2, '0')}`);
      }

    const budgetWhere = familyId
      ? { 
          OR: [
            { family_id: familyId, month: { in: months }, scope: 'family' },
            { family_id: null, user_id: user.id, month: { in: months }, scope: 'personal' }
          ]
        }
      : { family_id: null, user_id: user.id, month: { in: months }, scope: 'personal' };

      const budgets = await prisma.budget.findMany({
        where: budgetWhere,
        include: {
          category: { select: { id: true, name: true, type: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { limit_amount: 'desc' },
      });

      const budgetMap = new Map();
      for (const b of budgets) {
        const key = `${b.category_id}:${b.scope}`;
        if (!budgetMap.has(key)) {
          budgetMap.set(key, { 
            id: b.id,
            month: year,
            category_id: b.category_id,
            category_name: b.category?.name || '',
            category_type: b.category?.type || 'expense',
            limit_amount: 0,
            actual_amount: 0,
            scope: b.scope,
            spent_by_members: [],
          });
        }
        budgetMap.get(key).limit_amount += Number(b.limit_amount || 0);
      }

      const txDateStart = new Date(`${year}-01-01`);
      const txDateEnd = new Date(`${Number(year) + 1}-01-01`);
      
      const txWhere = familyId
        ? { 
            OR: [
              { family_id: familyId, scope: 'family', date: { gte: txDateStart, lt: txDateEnd } },
              { family_id: null, user_id: user.id, date: { gte: txDateStart, lt: txDateEnd } }
            ]
          }
        : { family_id: null, user_id: user.id, date: { gte: txDateStart, lt: txDateEnd } };

      if (memberId) {
        txWhere.user_id = memberId;
      }

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

      const members = familyId
        ? await prisma.user.findMany({ where: { family_id: familyId }, select: { id: true, name: true } })
        : [{ id: user.id, name: user.name }];

      memberContributions = {};
      members.forEach(m => { memberContributions[m.id] = { name: m.name, amount: 0 }; });

      for (const a of actuals) {
        if (memberContributions[a.user_id]) {
          memberContributions[a.user_id].amount += Number(a._sum.amount || 0);
        }
      }

      items = Array.from(budgetMap.values()).map(b => {
        const categoryType = b.category_type;
        const key = `${categoryType}:${b.category_id}`;
        const byMember = actualMap.get(key) || {};
        const total = Object.values(byMember).reduce((s, v) => s + v, 0);
        const limit = Number(b.limit_amount || 0);
        return {
          ...b,
          limit_amount: limit,
          actual_amount: total,
          progress: limit > 0 ? (total / limit) * 100 : 0,
          spent_by_members: members.map(m => ({
            userId: m.id,
            name: m.name,
            amount: byMember[m.id] || 0,
            percentage: total > 0 ? Math.round((byMember[m.id] || 0) / total * 100) : 0,
          })),
        };
      });

      logger.info({ userId: user.id, action: 'getBudgets', period: 'year', year });
      res.json({ year, items, memberContributions });
      return;
    }

    const { start, end } = monthStartEnd(month);
    logger.info({ start, end }, 'BUDGETS GET month range');

    const startDate = new Date(start);
    const endDate = new Date(end);
    
    let txWhere = familyId
      ? { family_id: familyId, date: { gte: startDate, lt: endDate } }
      : { family_id: null, user_id: user.id, date: { gte: startDate, lt: endDate } };

    const privacyFilter = { OR: [{ scope: 'family' }, { user_id: user.id }] };
    txWhere = { ...txWhere, ...privacyFilter };

    if (memberId) {
      txWhere.user_id = memberId;
    }

    const budgetWhere = familyId
      ? { 
          OR: [
            { family_id: familyId, month, scope: 'family' },
            { family_id: null, user_id: user.id, month, scope: 'personal' }
          ]
        }
      : { family_id: null, user_id: user.id, month, scope: 'personal' };

    logger.info({ budgetWhere }, 'BUDGETS GET where');

    const budgets = await prisma.budget.findMany({
      where: budgetWhere,
      include: {
        category: { select: { id: true, name: true, type: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { limit_amount: 'desc' },
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

    const memberContributions2 = {};
    const members = familyId
      ? await prisma.user.findMany({ where: { family_id: familyId }, select: { id: true, name: true } })
      : [{ id: user.id, name: user.name }];

    members.forEach(m => { memberContributions2[m.id] = { name: m.name, amount: 0 }; });

    for (const a of actuals) {
      if (memberContributions2[a.user_id]) {
        memberContributions2[a.user_id].amount += Number(a._sum.amount || 0);
      }
    }

      items = budgets.map(b => {
        const categoryType = b.category?.type || 'expense';
        const key = `${categoryType}:${b.category_id}`;
        const byMember = actualMap.get(key) || {};
        const total = Object.values(byMember).reduce((s, v) => s + v, 0);
        const limit = Number(b.limit_amount || 0);
        return {
          id: b.id,
          month: b.month,
          category_id: b.category_id,
          category_name: b.category?.name || '',
          category_type: categoryType,
          limit_amount: limit,
          actual_amount: total,
          progress: limit > 0 ? (total / limit) * 100 : 0,
          scope: b.scope,
          spent_by_members: members.map(m => ({
            userId: m.id,
            name: m.name,
            amount: byMember[m.id] || 0,
            percentage: total > 0 ? Math.round((byMember[m.id] || 0) / total * 100) : 0,
          })),
        };
      });

    logger.info({ userId: user.id, action: 'getBudgets', month });
    res.json({ month, items, memberContributions: memberContributions2 });
  } catch (error) {
    next(error);
  }
};

exports.createBudget = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const { month, category_id, limit_amount, scope = 'personal' } = req.validated;

    const limit = Number(limit_amount);
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new ValidationError('limit_amount должен быть > 0');
    }

    // Получаем категорию для определения типа бюджета
    const category = await prisma.category.findFirst({
      where: { id: Number(category_id) }
    });
    if (!category) {
      throw new ValidationError('Категория не найдена');
    }

    // scope: 'personal' -> family_id = null, 'family' -> family_id = familyId
    const budgetScope = scope === 'family' && familyId ? scope : 'personal';
    const budgetFamilyId = budgetScope === 'personal' ? null : familyId;

    const budget = await prisma.budget.create({
      data: {
        family_id: budgetFamilyId,
        user_id: user.id,
        category_id: Number(category_id),
        month,
        limit_amount: limit,
        type: category.type,
        scope: budgetScope,
      },
    });

    logger.info({ userId: user.id, budgetId: budget.id, action: 'createBudget' });
    res.status(201).json({ ...budget, type: category.type, category_type: category.type });
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

    const data = {};
    const v = req.validated || {};
    if (v.limit_amount !== undefined) {
      data.limit_amount = v.limit_amount;
    }
    if (v.month !== undefined) {
      data.month = v.month;
    }
    if (v.category_id !== undefined) {
      const cat = await prisma.category.findFirst({ where: { id: Number(v.category_id) } });
      if (!cat) throw new NotFoundError('Категория не найдена');
      data.category_id = Number(v.category_id);
    }
    if (v.type !== undefined) {
      data.type = v.type;
    }
    data.updated_at = new Date();

    const updated = await prisma.budget.update({
      where: { id: Number(id) },
      data,
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
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};