const prisma = require('../lib/prisma-client');
const { logger } = require('../lib/errors');

function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function getPersonalBalance(familyId, userId) {
  // Баланс = сумма ликвидных счетов
  const accounts = await prisma.account.findMany({
    where: { user_id: userId, family_id: null, is_active: true, is_liquid: true }
  });
  const balance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  // All-time income/expense для справки
  const incomeWhere = { user_id: userId, family_id: null, scope: 'personal', type: 'income' };
  const expenseWhere = { user_id: userId, family_id: null, scope: 'personal', type: 'expense' };
  const income = await prisma.transaction.aggregate({ where: incomeWhere, _sum: { amount: true } });
  const expense = await prisma.transaction.aggregate({ where: expenseWhere, _sum: { amount: true } });
  return {
    income: Number(income._sum.amount || 0),
    expense: Number(expense._sum.amount || 0),
    balance
  };
}

async function getPersonalReserved(familyId, userId) {
  // Резервы = только личные Goals/Wishes (family_id=null)
  const goalsWhere = { user_id: userId, family_id: null };
  const wishesWhere = { user_id: userId, family_id: null };
  const goals = await prisma.goal.aggregate({ where: goalsWhere, _sum: { current_amount: true } });
  const wishes = await prisma.wish.aggregate({ where: wishesWhere, _sum: { saved_amount: true } });
  return Number(goals._sum.current_amount || 0) + Number(wishes._sum.saved_amount || 0);
}

async function getFamilyBalance(familyId) {
  // Баланс = сумма всех ликвидных счетов семьи + личных ликвидных счетов членов
  const memberIds = (await prisma.user.findMany({ where: { family_id: familyId }, select: { id: true } })).map(u => u.id);
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
  // All-time income/expense для справки
  const incomeWhere = {
    type: 'income',
    OR: [
      { family_id: familyId, scope: { in: ['family', 'shared'] } },
      { family_id: null, user_id: { in: memberIds }, scope: 'personal' }
    ]
  };
  const expenseWhere = {
    type: 'expense',
    OR: [
      { family_id: familyId, scope: { in: ['family', 'shared'] } },
      { family_id: null, user_id: { in: memberIds }, scope: 'personal' }
    ]
  };
  const income = await prisma.transaction.aggregate({ where: incomeWhere, _sum: { amount: true } });
  const expense = await prisma.transaction.aggregate({ where: expenseWhere, _sum: { amount: true } });
  return {
    income: Number(income._sum.amount || 0),
    expense: Number(expense._sum.amount || 0),
    balance
  };
}

async function getFamilyReserved(familyId) {
  const memberIds = (await prisma.user.findMany({ where: { family_id: familyId }, select: { id: true } })).map(u => u.id);
  // Резервы = семейные Goals/Wishes (family_id=familyId) + личные всех членов семьи (family_id=null)
  const goalsWhere = {
    OR: [
      { family_id: familyId },
      { user_id: { in: memberIds }, family_id: null }
    ]
  };
  const goals = await prisma.goal.aggregate({ where: goalsWhere, _sum: { current_amount: true } });
  const wishesWhere = {
    OR: [
      { family_id: familyId },
      { user_id: { in: memberIds }, family_id: null }
    ]
  };
  const wishes = await prisma.wish.aggregate({ where: wishesWhere, _sum: { saved_amount: true } });
  return Number(goals._sum.current_amount || 0) + Number(wishes._sum.saved_amount || 0);
}

async function getMonthIncome(userId, familyId, startDateStr, endDateStr) {
  const parts1 = startDateStr.split('-').map(Number);
  const startDateTime = new Date(parts1[0], parts1[1] - 1, parts1[2], 0, 0, 0, 0);
  const parts2 = endDateStr.split('-').map(Number);
  const endDateTime = new Date(parts2[0], parts2[1] - 1, parts2[2], 23, 59, 59, 999);
  
  let where;
  if (familyId) {
    const memberIds = (await prisma.user.findMany({ where: { family_id: familyId }, select: { id: true } })).map(u => u.id);
    where = {
      type: 'income',
      date: { gte: startDateTime, lte: endDateTime },
      OR: [
        { family_id: familyId, scope: { in: ['family', 'shared'] } },
        { family_id: null, user_id: { in: memberIds }, scope: 'personal' }
      ]
    };
  } else {
    where = { user_id: userId, family_id: null, scope: 'personal', type: 'income', date: { gte: startDateTime, lte: endDateTime } };
  }
  
  const result = await prisma.transaction.aggregate({ where, _sum: { amount: true } });
  return result._sum.amount || 0;
}

async function getMonthExpenses(userId, familyId, startDateStr, endDateStr) {
  const parts1 = startDateStr.split('-').map(Number);
  const startDateTime = new Date(parts1[0], parts1[1] - 1, parts1[2], 0, 0, 0, 0);
  const parts2 = endDateStr.split('-').map(Number);
  const endDateTime = new Date(parts2[0], parts2[1] - 1, parts2[2], 23, 59, 59, 999);
  
  let where;
  if (familyId) {
    const memberIds = (await prisma.user.findMany({ where: { family_id: familyId }, select: { id: true } })).map(u => u.id);
    where = {
      type: 'expense',
      date: { gte: startDateTime, lte: endDateTime },
      OR: [
        { family_id: familyId, scope: { in: ['family', 'shared'] } },
        { family_id: null, user_id: { in: memberIds }, scope: 'personal' }
      ]
    };
  } else {
    where = { user_id: userId, family_id: null, scope: 'personal', type: 'expense', date: { gte: startDateTime, lte: endDateTime } };
  }
  
  const result = await prisma.transaction.aggregate({ where, _sum: { amount: true } });
  return result._sum.amount || 0;
}

async function getAllocation(familyId, userId, startDateStr, endDateStr) {
  const parts1 = startDateStr.split('-').map(Number);
  const startDateTime = new Date(parts1[0], parts1[1] - 1, parts1[2], 0, 0, 0, 0);
  const parts2 = endDateStr.split('-').map(Number);
  const endDateTime = new Date(parts2[0], parts2[1] - 1, parts2[2], 23, 59, 59, 999);
  
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
      const personalBalance = await getPersonalBalance(null, user.id);
      const personalReserved = await getPersonalReserved(null, user.id);
      // Гарантируем, что available никогда не больше balance
      const rawAvailable = personalBalance.balance - personalReserved;
      const personalAvailable = Math.min(personalBalance.balance, Math.max(0, rawAvailable));

      const lastTxs = await prisma.transaction.findMany({
        where: { user_id: user.id, family_id: null, scope: 'personal' },
        take: 5,
        include: { category: true, user: true },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      });

      const activeGoals = await prisma.goal.findMany({
        where: { user_id: user.id, family_id: null },
        orderBy: { created_at: 'desc' },
        take: 3,
      });

      const activeWishes = await prisma.wish.findMany({
        where: { user_id: user.id, family_id: null, status: 'active', archived: false },
        orderBy: { created_at: 'desc' },
        take: 3,
      });

      const allocation = await getAllocation(null, user.id, monthStartStr, todayStr);

      const monthExpenses = await getMonthExpenses(user.id, null, monthStartStr, todayStr);
      const monthIncome = await getMonthIncome(user.id, null, monthStartStr, todayStr);
      
      const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      const prevMonthStartStr = `${prevMonthStart.getFullYear()}-${String(prevMonthStart.getMonth() + 1).padStart(2, '0')}-01`;
      const prevMonthEndStr = `${prevMonthEnd.getFullYear()}-${String(prevMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(prevMonthEnd.getDate()).padStart(2, '0')}`;
      const prevMonthIncome = await getMonthIncome(user.id, null, prevMonthStartStr, prevMonthEndStr);
      const prevMonthExpenses = await getMonthExpenses(user.id, null, prevMonthStartStr, prevMonthEndStr);
      
      const incomeChange = prevMonthIncome > 0 ? ((Number(monthIncome) - prevMonthIncome) / prevMonthIncome) * 100 : 0;
      const expenseChange = prevMonthExpenses > 0 ? ((Number(monthExpenses) - prevMonthExpenses) / prevMonthExpenses) * 100 : 0;
      
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
    
    const personalIncomeAgg = await prisma.transaction.aggregate({
      where: { user_id: user.id, family_id: null, scope: 'personal', type: 'income' },
      _sum: { amount: true },
    });
    const personalExpenseAgg = await prisma.transaction.aggregate({
      where: { user_id: user.id, family_id: null, scope: 'personal', type: 'expense' },
      _sum: { amount: true },
    });
    const personalBalance = { 
      income: Number(personalIncomeAgg._sum.amount || 0), 
      expense: Number(personalExpenseAgg._sum.amount || 0), 
      balance: Number(personalIncomeAgg._sum.amount || 0) - Number(personalExpenseAgg._sum.amount || 0) 
    };
    
    const personalGoalsAgg = await prisma.goal.aggregate({
      where: { user_id: user.id, family_id: null },
      _sum: { current_amount: true }
    });
    const personalWishesAgg = await prisma.wish.aggregate({
      where: { user_id: user.id, family_id: null },
      _sum: { saved_amount: true }
    });
    const personalReserved = Number(personalGoalsAgg._sum.current_amount || 0) + Number(personalWishesAgg._sum.saved_amount || 0);
    const rawAvailable = personalBalance.balance - personalReserved;
    const personalAvailable = Math.min(personalBalance.balance, Math.max(0, rawAvailable));

    const familyBalance = await getFamilyBalance(familyId);
    const familyReserved = await getFamilyReserved(familyId);
    const rawFamilyAvailable = familyBalance.balance - familyReserved;
    const familyAvailable = Math.min(familyBalance.balance, Math.max(0, rawFamilyAvailable));

    const lastTxs = await prisma.transaction.findMany({
      where: memberId
        ? { OR: [
            { family_id: familyId, scope: { in: ['family', 'shared'] }, user_id: memberId },
            { family_id: null, user_id: memberId, scope: 'personal' }
          ]}
        : { OR: [
            { family_id: familyId, scope: { in: ['family', 'shared'] } },
            { family_id: null, user_id: user.id, scope: 'personal' }
          ]},
      take: 5,
      include: { category: true, user: true },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });

    const activeGoals = await prisma.goal.findMany({
      where: memberId
        ? { OR: [
            { family_id: familyId, user_id: memberId },
            { family_id: null, user_id: memberId }
          ]}
        : { OR: [
            { family_id: familyId },
            { user_id: user.id, family_id: null }
          ]},
      take: 3,
    });

    const activeWishes = await prisma.wish.findMany({
      where: memberId
        ? { OR: [
            { family_id: familyId, user_id: memberId },
            { family_id: null, user_id: memberId }
          ], status: 'active', archived: false }
        : { OR: [
            { family_id: familyId },
            { user_id: user.id, family_id: null }
          ], status: 'active', archived: false },
      take: 3,
    });

    const allocation = await getAllocation(familyId, user.id, monthStartStr, todayStr);
    const familyMonthIncome = await getMonthIncome(user.id, familyId, monthStartStr, todayStr);
    const familyMonthExpenses = await getMonthExpenses(user.id, familyId, monthStartStr, todayStr);
    
    const personalMonthIncomeAgg = await prisma.transaction.aggregate({
      where: { user_id: user.id, family_id: null, scope: 'personal', type: 'income', date: { gte: new Date(today.getFullYear(), today.getMonth(), 1), lte: today } },
      _sum: { amount: true },
    });
    const personalMonthExpenseAgg = await prisma.transaction.aggregate({
      where: { user_id: user.id, family_id: null, scope: 'personal', type: 'expense', date: { gte: new Date(today.getFullYear(), today.getMonth(), 1), lte: today } },
      _sum: { amount: true },
    });
    const personalMonthIncome = Number(personalMonthIncomeAgg._sum.amount || 0);
    const personalMonthExpenses = Number(personalMonthExpenseAgg._sum.amount || 0);

    const members = await prisma.user.findMany({ where: { family_id: familyId }, select: { id: true, name: true } });
    const memberIds = members.map(m => m.id);
    
    const [incomeStats, expenseStats] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['user_id'],
        where: { 
          user_id: { in: memberIds }, 
          type: 'income',
          OR: [
            { family_id: familyId, scope: { in: ['family', 'shared'] } },
            { family_id: null, scope: 'personal' }
          ]
        },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['user_id'],
        where: { 
          user_id: { in: memberIds }, 
          type: 'expense',
          OR: [
            { family_id: familyId, scope: { in: ['family', 'shared'] } },
            { family_id: null, scope: 'personal' }
          ]
        },
        _sum: { amount: true },
      }),
    ]);

    const memberStatsMap = new Map();
    members.forEach(m => {
      memberStatsMap.set(m.id, { userId: m.id, name: m.name, income: 0, expenses: 0, contributions: 0 });
    });
    incomeStats.forEach(s => {
      if (memberStatsMap.has(s.user_id)) {
        memberStatsMap.get(s.user_id).income = Number(s._sum.amount || 0);
      }
    });
    expenseStats.forEach(s => {
      if (memberStatsMap.has(s.user_id)) {
        memberStatsMap.get(s.user_id).expenses = Number(s._sum.amount || 0);
      }
    });
    const memberStats = Array.from(memberStatsMap.values());

    logger.info(`User ${user.id} got family dashboard, familyId: ${familyId}`);
    res.json({
      family: {
        balance: familyBalance.balance,
        income: familyBalance.income,
        expenses: familyBalance.expense,
        monthIncome: Number(familyMonthIncome),
        monthExpenses: Number(familyMonthExpenses),
        available: familyAvailable,
        reserved: familyReserved,
        memberStats,
      },
      personal: {
        balance: Number(personalBalance.balance),
        income: Number(personalBalance.income),
        expenses: Number(personalBalance.expense),
        monthIncome: Number(personalMonthIncome),
        monthExpenses: Number(personalMonthExpenses),
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