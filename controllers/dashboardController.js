const { User, Category, Transaction, Goal, Wish } = require('../lib/models');

function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function getPersonalBalance(familyId, userId) {
  const { prisma } = require('../lib/models');
  
  let incomeWhere, expenseWhere;
  if (familyId) {
    incomeWhere = {
      type: 'income',
      OR: [
        { family_id: familyId, is_private: false },
        { family_id: familyId, user_id: userId },
        { family_id: null, user_id: userId }
      ]
    };
    expenseWhere = {
      type: 'expense',
      OR: [
        { family_id: familyId, is_private: false },
        { family_id: familyId, user_id: userId },
        { family_id: null, user_id: userId }
      ]
    };
  } else {
    incomeWhere = { user_id: userId, family_id: null, type: 'income' };
    expenseWhere = { user_id: userId, family_id: null, type: 'expense' };
  }
  
  const income = await prisma.transaction.aggregate({ where: incomeWhere, _sum: { amount: true } });
  const expense = await prisma.transaction.aggregate({ where: expenseWhere, _sum: { amount: true } });
  
  return { 
    income: Number(income._sum.amount || 0), 
    expense: Number(expense._sum.amount || 0), 
    balance: Number(income._sum.amount || 0) - Number(expense._sum.amount || 0) 
  };
}

async function getPersonalReserved(familyId, userId) {
  const { prisma } = require('../lib/models');
  const goalsWhere = familyId
    ? { OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
    : { family_id: null, user_id: userId };
  const goals = await prisma.goal.aggregate({ where: goalsWhere, _sum: { current_amount: true } });
  const wishesWhere = familyId
    ? { OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
    : { family_id: null, user_id: userId };
  const wishes = await prisma.wish.aggregate({ where: wishesWhere, _sum: { saved_amount: true } });
  return Number(goals._sum.current_amount || 0) + Number(wishes._sum.saved_amount || 0);
}

async function getMonthIncome(userId, familyId, startDateStr, endDateStr) {
  const { prisma } = require('../lib/models');
  const parts1 = startDateStr.split('-').map(Number);
  const startDateTime = new Date(parts1[0], parts1[1] - 1, parts1[2], 0, 0, 0, 0);
  const parts2 = endDateStr.split('-').map(Number);
  const endDateTime = new Date(parts2[0], parts2[1] - 1, parts2[2], 23, 59, 59, 999);
  
  let where;
  if (familyId) {
    where = {
      type: 'income',
      date: { gte: startDateTime, lte: endDateTime },
      OR: [
        { family_id: familyId },
        { family_id: null, user_id: userId }
      ]
    };
  } else {
    where = { user_id: userId, family_id: null, type: 'income', date: { gte: startDateTime, lte: endDateTime } };
  }
  
  const result = await prisma.transaction.aggregate({ where, _sum: { amount: true } });
  return result._sum.amount || 0;
}

async function getMonthExpenses(userId, familyId, startDateStr, endDateStr) {
  const { prisma } = require('../lib/models');
  const parts1 = startDateStr.split('-').map(Number);
  const startDateTime = new Date(parts1[0], parts1[1] - 1, parts1[2], 0, 0, 0, 0);
  const parts2 = endDateStr.split('-').map(Number);
  const endDateTime = new Date(parts2[0], parts2[1] - 1, parts2[2], 23, 59, 59, 999);
  
  let where;
  if (familyId) {
    where = {
      type: 'expense',
      date: { gte: startDateTime, lte: endDateTime },
      OR: [
        { family_id: familyId },
        { family_id: null, user_id: userId }
      ]
    };
  } else {
    where = { user_id: userId, family_id: null, type: 'expense', date: { gte: startDateTime, lte: endDateTime } };
  }
  
  const result = await prisma.transaction.aggregate({ where, _sum: { amount: true } });
  return result._sum.amount || 0;
}

async function getAllocation(familyId, userId, startDateStr, endDateStr) {
  const { prisma } = require('../lib/models');
  
  const parts1 = startDateStr.split('-').map(Number);
  const startDateTime = new Date(parts1[0], parts1[1] - 1, parts1[2], 0, 0, 0, 0);
  const parts2 = endDateStr.split('-').map(Number);
  const endDateTime = new Date(parts2[0], parts2[1] - 1, parts2[2], 23, 59, 59, 999);
  
  const where = familyId
    ? {
      date: { gte: startDateTime, lte: endDateTime },
      type: 'expense',
      OR: [
        { family_id: familyId },
        { family_id: null, user_id: userId }
      ]
    }
    : { user_id: userId, family_id: null, date: { gte: startDateTime, lte: endDateTime }, type: 'expense' };
  
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

exports.getDashboard = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const today = new Date();
    const todayStr = toStr(today);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = toStr(monthStart);

    if (!familyId) {
      // Solo mode
      const personalBalance = await getPersonalBalance(null, user.id);
      const personalReserved = await getPersonalReserved(null, user.id);
      const personalAvailable = personalBalance.balance - personalReserved;

      const lastTxs = await prisma.transaction.findMany({
        where: { user_id: user.id, family_id: null },
        take: 5,
        include: { category: true, user: true },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      });

      const activeGoals = await Goal.findAll({
        where: { user_id: user.id, family_id: null },
        order: [['created_at', 'DESC']],
        limit: 3,
      });

      const allocation = await getAllocation(null, user.id, monthStartStr, todayStr);

      const monthExpenses = await getMonthExpenses(user.id, null, monthStartStr, todayStr);
      const monthIncome = await getMonthIncome(user.id, null, monthStartStr, todayStr);
      
      return res.json({
        family: null,
        personal: {
          balance: Number(personalBalance.balance),
          income: Number(personalBalance.income),
          expenses: Number(personalBalance.expense),
          monthIncome: Number(monthIncome),
          monthExpenses: Number(monthExpenses),
          reserved: Number(personalReserved),
          available: Number(personalAvailable),
          user_id: user.id,
        },
        lastTransactions: lastTxs.map(t => ({
          id: t.id, amount: t.amount, type: t.type, date: t.date, comment: t.comment,
          category_id: t.category_id, category_name: t.category?.name || 'Без категории',
          user: { id: user.id, name: user.name }
        })),
        activeGoals,
        warning: null,
        allocation,
      });
    }

    // Family mode
    const memberId = req.query.memberId ? Number(req.query.memberId) : null;
    
    const personalBalance = await getPersonalBalance(familyId, user.id);
    const personalReserved = await getPersonalReserved(familyId, user.id);
    const personalAvailable = personalBalance.balance - personalReserved;

    const { prisma } = require('../lib/models');
    const familyIncome = await prisma.transaction.aggregate({
      where: { family_id: familyId, type: 'income' },
      _sum: { amount: true },
    });
    const familyExpenses = await prisma.transaction.aggregate({
      where: { family_id: familyId, type: 'expense' },
      _sum: { amount: true },
    });
    const familyBalance = { 
      income: Number(familyIncome._sum.amount || 0), 
      expense: Number(familyExpenses._sum.amount || 0), 
      balance: Number(familyIncome._sum.amount || 0) - Number(familyExpenses._sum.amount || 0) 
    };
    const familyReserved = await getPersonalReserved(familyId, user.id);
    const familyAvailable = familyBalance.balance - familyReserved;

    const lastTxs = await prisma.transaction.findMany({
      where: memberId
        ? { user_id: memberId, OR: [{ family_id: familyId }, { family_id: null, user_id: memberId }] }
        : { OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] },
      take: 5,
      include: { category: true, user: true },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });

    const activeGoals = await Goal.findAll({
      where: memberId
        ? { user_id: memberId, OR: [{ family_id: familyId }, { family_id: null, user_id: memberId }] }
        : { OR: [{ family_id: familyId }, { user_id: user.id, family_id: null }] },
      limit: 3,
    });

    const allocation = await getAllocation(familyId, user.id, monthStartStr, todayStr);
    const familyMonthIncome = await getMonthIncome(user.id, familyId, monthStartStr, todayStr);
    const familyMonthExpenses = await getMonthExpenses(user.id, familyId, monthStartStr, todayStr);
    const personalMonthIncome = await getMonthIncome(user.id, user.id, monthStartStr, todayStr);
    const personalMonthExpenses = await getMonthExpenses(user.id, user.id, monthStartStr, todayStr);

    // Get member stats
    const members = await User.findAll({ where: { family_id: familyId }, attributes: ['id', 'name'] });
    const memberStats = await Promise.all(members.map(async m => {
      const mBalance = await getPersonalBalance(familyId, m.id);
      return { userId: m.id, name: m.name, income: mBalance.income, expenses: mBalance.expense, contributions: 0 };
    }));

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
        user: { id: t.user_id, name: t.user?.name || members.find(m => m.id === t.user_id)?.name || 'Unknown' }
      })),
      activeGoals,
      warning: null,
      allocation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};