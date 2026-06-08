const prisma = require('../lib/prisma-client');
const { logger } = require('../lib/errors');

function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateRange(startDateStr, endDateStr) {
  const parts1 = startDateStr.split('-').map(Number);
  const parts2 = endDateStr.split('-').map(Number);
  return {
    startDateTime: new Date(parts1[0], parts1[1] - 1, parts1[2], 0, 0, 0, 0),
    endDateTime: new Date(parts2[0], parts2[1] - 1, parts2[2], 23, 59, 59, 999),
  };
}

async function getPersonalBalance(userId) {
  const accounts = await prisma.account.findMany({
    where: { user_id: userId, family_id: null, is_active: true, is_liquid: true }
  });
  const balance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({ where: { user_id: userId, family_id: null, scope: 'personal', type: 'income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { user_id: userId, family_id: null, scope: 'personal', type: 'expense' }, _sum: { amount: true } }),
  ]);
  return {
    income: Number(income._sum.amount || 0),
    expense: Number(expense._sum.amount || 0),
    balance
  };
}

async function getPersonalReserved(userId) {
  const [goals, wishes] = await Promise.all([
    prisma.goal.aggregate({ where: { user_id: userId, family_id: null }, _sum: { current_amount: true } }),
    prisma.wish.aggregate({ where: { user_id: userId, family_id: null }, _sum: { saved_amount: true } }),
  ]);
  return Number(goals._sum.current_amount || 0) + Number(wishes._sum.saved_amount || 0);
}

async function getFamilyBalance(familyId, memberIds) {
  const accounts = await prisma.account.findMany({
    where: {
      is_active: true,
      is_liquid: true,
      OR: [
        { family_id: familyId },
        { family_id: null, user_id: { in: memberIds } }
      ]
    }
  });
  const balance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const txWhere = {
    OR: [
      { family_id: familyId, scope: { in: ['family', 'shared'] } },
      { family_id: null, user_id: { in: memberIds }, scope: 'personal' }
    ]
  };
  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({ where: { ...txWhere, type: 'income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...txWhere, type: 'expense' }, _sum: { amount: true } }),
  ]);
  return {
    income: Number(income._sum.amount || 0),
    expense: Number(expense._sum.amount || 0),
    balance
  };
}

async function getFamilyReserved(familyId, memberIds) {
  const [goals, wishes] = await Promise.all([
    prisma.goal.aggregate({
      where: { OR: [{ family_id: familyId }, { user_id: { in: memberIds }, family_id: null }] },
      _sum: { current_amount: true }
    }),
    prisma.wish.aggregate({
      where: { OR: [{ family_id: familyId }, { user_id: { in: memberIds }, family_id: null }] },
      _sum: { saved_amount: true }
    }),
  ]);
  return Number(goals._sum.current_amount || 0) + Number(wishes._sum.saved_amount || 0);
}

async function getMonthTotals(userId, familyId, memberIds, startDateStr, endDateStr) {
  const { startDateTime, endDateTime } = parseDateRange(startDateStr, endDateStr);
  const txWhere = familyId
    ? {
        date: { gte: startDateTime, lte: endDateTime },
        OR: [
          { family_id: familyId, scope: { in: ['family', 'shared'] } },
          { family_id: null, user_id: { in: memberIds }, scope: 'personal' }
        ]
      }
    : { user_id: userId, family_id: null, scope: 'personal', date: { gte: startDateTime, lte: endDateTime } };
  const [incomeResult, expenseResult] = await Promise.all([
    prisma.transaction.aggregate({ where: { ...txWhere, type: 'income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...txWhere, type: 'expense' }, _sum: { amount: true } }),
  ]);
  return {
    income: Number(incomeResult._sum.amount || 0),
    expenses: Number(expenseResult._sum.amount || 0),
  };
}

async function getAllocation(familyId, userId, startDateStr, endDateStr) {
  const { startDateTime, endDateTime } = parseDateRange(startDateStr, endDateStr);
  
  const where = familyId
    ? {
        date: { gte: startDateTime, lte: endDateTime },
        type: 'expense',
        OR: [
          { family_id: familyId, scope: { in: ['family', 'shared'] } },
          { family_id: null, user_id: userId, scope: 'personal' }
        ]
      }
    : { user_id: userId, family_id: null, scope: 'personal', date: { gte: startDateTime, lte: endDateTime }, type: 'expense' };
  
  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
  });
  
  const byCategory = {};
  for (const tx of transactions) {
    const catName = tx.category?.name || 'Без категории';
    byCategory[catName] = (byCategory[catName] || 0) + Number(tx.amount);
  }
  
  const entries = Object.entries(byCategory);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return entries.map(([name, value]) => ({ name, total: value, pct: total > 0 ? Math.round(value / total * 100) : 0 }));
}

exports.getDashboard = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const today = new Date();
    const todayStr = toStr(today);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = toStr(monthStart);

    if (!familyId) {
      const [personalBalance, personalReserved, currentMonth, prevMonth] = await Promise.all([
        getPersonalBalance(user.id),
        getPersonalReserved(user.id),
        getMonthTotals(user.id, null, null, monthStartStr, todayStr),
        (() => {
          const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
          const prevMonthStartStr = toStr(prevMonthStart);
          const prevMonthEndStr = toStr(prevMonthEnd);
          return getMonthTotals(user.id, null, null, prevMonthStartStr, prevMonthEndStr);
        })(),
      ]);
      const rawAvailable = personalBalance.balance - personalReserved;
      const personalAvailable = Math.min(personalBalance.balance, Math.max(0, rawAvailable));

      const [lastTxs, activeGoals, activeWishes, allocation] = await Promise.all([
        prisma.transaction.findMany({
          where: { user_id: user.id, family_id: null, scope: 'personal' },
          take: 5,
          include: { category: true, user: true },
          orderBy: [{ date: 'desc' }, { id: 'desc' }],
        }),
        prisma.goal.findMany({
          where: { user_id: user.id, family_id: null },
          orderBy: { created_at: 'desc' },
          take: 3,
        }),
        prisma.wish.findMany({
          where: { user_id: user.id, family_id: null, status: 'active', archived: false },
          orderBy: { created_at: 'desc' },
          take: 3,
        }),
        getAllocation(null, user.id, monthStartStr, todayStr),
      ]);

      const monthIncome = Number(currentMonth.income);
      const monthExpenses = Number(currentMonth.expenses);
      const prevMonthIncome = Number(prevMonth.income);
      const prevMonthExpenses = Number(prevMonth.expenses);
      const incomeChange = prevMonthIncome > 0 ? ((monthIncome - prevMonthIncome) / prevMonthIncome) * 100 : 0;
      const expenseChange = prevMonthExpenses > 0 ? ((monthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100 : 0;
      
      logger.info(`User ${user.id} got personal dashboard`);
      return res.json({
        family: null,
        personal: {
          balance: Number(personalBalance.balance),
          income: Number(personalBalance.income),
          expenses: Number(personalBalance.expense),
          monthIncome: Number(monthIncome),
          monthExpenses: Number(monthExpenses),
          monthIncomeChange: Math.round(incomeChange),
          monthExpenseChange: Math.round(expenseChange),
          prevMonthIncome: Number(prevMonthIncome),
          prevMonthExpenses: Number(prevMonthExpenses),
          reserved: Number(personalReserved),
          available: Number(personalAvailable),
          user_id: user.id,
        },
        lastTransactions: lastTxs.map(t => ({
          id: t.id, amount: t.amount, type: t.type, date: t.date, comment: t.comment,
          category_id: t.category_id, category_name: t.category?.name || 'Без категории',
          family_id: t.family_id,
          scope: t.scope,
          user_id: t.user_id,
          user: { id: t.user_id, name: t.user?.name || 'Участник' }
        })),
        activeGoals,
        activeWishes,
        warning: null,
        allocation,
      });
    }

    const memberId = req.query.memberId ? Number(req.query.memberId) : null;
    const members = await prisma.user.findMany({ where: { family_id: familyId }, select: { id: true, name: true } });
    const memberIds = members.map(m => m.id);

    const [personalData, familyBalance, familyReserved, monthData, personalMonthData, lastTxs, activeGoals, activeWishes, allocation, stats] = await Promise.all([
      (async () => {
        const [incomeAgg, expenseAgg, goalsAgg, wishesAgg] = await Promise.all([
          prisma.transaction.aggregate({ where: { user_id: user.id, family_id: null, scope: 'personal', type: 'income' }, _sum: { amount: true } }),
          prisma.transaction.aggregate({ where: { user_id: user.id, family_id: null, scope: 'personal', type: 'expense' }, _sum: { amount: true } }),
          prisma.goal.aggregate({ where: { user_id: user.id, family_id: null }, _sum: { current_amount: true } }),
          prisma.wish.aggregate({ where: { user_id: user.id, family_id: null }, _sum: { saved_amount: true } }),
        ]);
        const inc = Number(incomeAgg._sum.amount || 0);
        const exp = Number(expenseAgg._sum.amount || 0);
        const balance = inc - exp;
        const reserved = Number(goalsAgg._sum.current_amount || 0) + Number(wishesAgg._sum.saved_amount || 0);
        const rawAvailable = balance - reserved;
        return { income: inc, expenses: exp, balance, reserved, available: Math.min(balance, Math.max(0, rawAvailable)) };
      })(),
      getFamilyBalance(familyId, memberIds),
      getFamilyReserved(familyId, memberIds),
      getMonthTotals(user.id, familyId, memberIds, monthStartStr, todayStr),
      getMonthTotals(user.id, null, null, monthStartStr, todayStr),
      prisma.transaction.findMany({
        where: memberId
          ? { OR: [{ family_id: familyId, scope: { in: ['family', 'shared'] }, user_id: memberId }, { family_id: null, user_id: memberId, scope: 'personal' }] }
          : { OR: [{ family_id: familyId, scope: { in: ['family', 'shared'] } }, { family_id: null, user_id: user.id, scope: 'personal' }] },
        take: 5, include: { category: true, user: true }, orderBy: [{ date: 'desc' }, { id: 'desc' }],
      }),
      prisma.goal.findMany({
        where: memberId
          ? { OR: [{ family_id: familyId, user_id: memberId }, { family_id: null, user_id: memberId }] }
          : { OR: [{ family_id: familyId }, { user_id: user.id, family_id: null }] },
        take: 3,
      }),
      prisma.wish.findMany({
        where: memberId
          ? { OR: [{ family_id: familyId, user_id: memberId }, { family_id: null, user_id: memberId }], status: 'active', archived: false }
          : { OR: [{ family_id: familyId }, { user_id: user.id, family_id: null }], status: 'active', archived: false },
        take: 3,
      }),
      getAllocation(familyId, user.id, monthStartStr, todayStr),
      (async () => {
        const [incomeStats, expenseStats] = await Promise.all([
          prisma.transaction.groupBy({ by: ['user_id'], where: { user_id: { in: memberIds }, type: 'income', OR: [{ family_id: familyId, scope: { in: ['family', 'shared'] } }, { family_id: null, scope: 'personal' }] }, _sum: { amount: true } }),
          prisma.transaction.groupBy({ by: ['user_id'], where: { user_id: { in: memberIds }, type: 'expense', OR: [{ family_id: familyId, scope: { in: ['family', 'shared'] } }, { family_id: null, scope: 'personal' }] }, _sum: { amount: true } }),
        ]);
        const memberStatsMap = new Map();
        members.forEach(m => memberStatsMap.set(m.id, { userId: m.id, name: m.name, income: 0, expenses: 0, contributions: 0 }));
        incomeStats.forEach(s => { if (memberStatsMap.has(s.user_id)) memberStatsMap.get(s.user_id).income = Number(s._sum.amount || 0); });
        expenseStats.forEach(s => { if (memberStatsMap.has(s.user_id)) memberStatsMap.get(s.user_id).expenses = Number(s._sum.amount || 0); });
        return Array.from(memberStatsMap.values());
      })(),
    ]);

    const rawFamilyAvailable = familyBalance.balance - familyReserved;
    const familyAvailable = Math.min(familyBalance.balance, Math.max(0, rawFamilyAvailable));

    logger.info(`User ${user.id} got family dashboard, familyId: ${familyId}`);
    res.json({
      family: {
        balance: familyBalance.balance,
        income: familyBalance.income,
        expenses: familyBalance.expense,
        monthIncome: Number(monthData.income),
        monthExpenses: Number(monthData.expenses),
        available: familyAvailable,
        reserved: familyReserved,
        memberStats: stats,
      },
      personal: {
        balance: Number(personalData.balance),
        income: Number(personalData.income),
        expenses: Number(personalData.expenses),
        monthIncome: Number(personalMonthData.income),
        monthExpenses: Number(personalMonthData.expenses),
        reserved: Number(personalData.reserved),
        available: Number(personalData.available),
        user_id: user.id,
      },
        lastTransactions: lastTxs.map(t => ({
          id: t.id, amount: t.amount, type: t.type, date: t.date, comment: t.comment,
          category_id: t.category_id, category_name: t.category?.name || 'Без категории',
          family_id: t.family_id,
          scope: t.scope,
          user_id: t.user_id,
          user: { id: t.user_id, name: t.user?.name || 'Unknown' }
        })),
      activeGoals,
      activeWishes,
      warning: null,
      allocation,
    });
  } catch (error) {
    next(error);
  }
};