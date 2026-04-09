const { Transaction, Goal, Wish, User, GoalContribution, WishContribution } = require('../models');
const { Op, fn, col } = require('sequelize');

function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function getFamilyBalance(familyId) {
  const income = await Transaction.sum('amount', { where: { family_id: familyId, type: 'income' } }) || 0;
  const expense = await Transaction.sum('amount', { where: { family_id: familyId, type: 'expense' } }) || 0;
  return { income: Number(income), expense: Number(expense), balance: Number(income) - Number(expense) };
}

async function getPersonalBalance(familyId, userId) {
  const privacyFilter = { [Op.or]: [{ is_private: false }, { user_id: userId }] };
  const income = await Transaction.sum('amount', { where: { family_id: familyId, type: 'income', ...privacyFilter } }) || 0;
  const expense = await Transaction.sum('amount', { where: { family_id: familyId, type: 'expense', ...privacyFilter } }) || 0;
  return { income: Number(income), expense: Number(expense), balance: Number(income) - Number(expense) };
}

async function getFamilyReserved(familyId) {
  const goals = await Goal.sum('current_amount', { where: { family_id: familyId } }) || 0;
  const wishes = await Wish.sum('saved_amount', { where: { family_id: familyId } }) || 0;
  return Number(goals) + Number(wishes);
}

async function getPersonalReserved(familyId, userId) {
  const goals = await Goal.sum('current_amount', { where: { family_id: null, user_id: userId } }) || 0;
  const wishes = await Wish.sum('saved_amount', { where: { family_id: null, user_id: userId } }) || 0;
  return Number(goals) + Number(wishes);
}

async function getMemberStats(familyId, userId, startDate, endDate) {
  const members = await User.findAll({ where: { family_id: familyId }, attributes: ['id', 'name'] });

  const transactions = await Transaction.findAll({
    where: {
      family_id: familyId,
      date: { [Op.gte]: startDate, [Op.lte]: endDate },
      [Op.or]: [{ is_private: false }, { user_id: userId }],
    },
    attributes: [
      'user_id',
      'type',
      [fn('SUM', col('amount')), 'total'],
    ],
    group: ['user_id', 'type'],
    raw: true,
  });

  const goalContributions = await GoalContribution.findAll({
    where: { date: { [Op.gte]: startDate, [Op.lte]: endDate } },
    include: [{
      model: Goal,
      as: 'Goal',
      where: { family_id: familyId },
      attributes: [],
      required: true,
    }, {
      model: Transaction,
      as: 'Transaction',
      attributes: ['user_id'],
      required: false,
    }],
    attributes: [
      [col('Transaction.user_id'), 'user_id'],
      [fn('SUM', col('GoalContribution.amount')), 'total'],
    ],
    group: [[col('Transaction.user_id')]],
    raw: true,
  });

  const wishContributions = await WishContribution.findAll({
    where: { date: { [Op.gte]: startDate, [Op.lte]: endDate } },
    include: [{
      model: Wish,
      as: 'Wish',
      where: { family_id: familyId },
      attributes: [],
      required: true,
    }, {
      model: Transaction,
      as: 'Transaction',
      attributes: ['user_id'],
      required: false,
    }],
    attributes: [
      [col('Transaction.user_id'), 'user_id'],
      [fn('SUM', col('WishContribution.amount')), 'total'],
    ],
    group: [[col('Transaction.user_id')]],
    raw: true,
  });

  const goalContribMap = new Map(goalContributions.map(c => [c.user_id, Number(c.total || 0)]));
  const wishContribMap = new Map(wishContributions.map(c => [c.user_id, Number(c.total || 0)]));

  return members.map(member => {
    const memberTxs = transactions.filter(t => t.user_id === member.id);
    const income = memberTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.total || 0), 0);
    const expenses = memberTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.total || 0), 0);
    const goalContrib = goalContribMap.get(member.id) || 0;
    const wishContrib = wishContribMap.get(member.id) || 0;
    return {
      userId: member.id,
      name: member.name,
      income: Number(income),
      expenses: Number(expenses),
      contributions: goalContrib + wishContrib,
    };
  });
}

async function getAvailableFunds(familyId) {
  const { balance } = await getFamilyBalance(familyId);
  const reserved = await getFamilyReserved(familyId);
  return balance - reserved;
}

async function getPersonalAvailable(familyId, userId) {
  const { balance } = await getPersonalBalance(familyId, userId);
  const reserved = await getPersonalReserved(familyId, userId);
  return balance - reserved;
}

async function getAllocation(familyId, userId, monthStartStr, todayStr, privacyFilter) {
  const txWhere = familyId
    ? { family_id: familyId, type: 'expense', date: { [Op.gte]: monthStartStr, [Op.lte]: todayStr }, ...privacyFilter }
    : { user_id: userId, family_id: null, type: 'expense', date: { [Op.gte]: monthStartStr, [Op.lte]: todayStr }, ...privacyFilter };

  const Category = require('../models').Category;
  const expenses = await Transaction.findAll({
    where: txWhere,
    attributes: ['category_id', 'amount'],
    include: [{ model: Category, as: 'Category', attributes: ['name'] }],
    raw: true,
  });

  const totals = {};
  expenses.forEach(t => {
    const name = t['Category.name'] || 'Без категории';
    totals[name] = (totals[name] || 0) + Number(t.amount);
  });

  const total = Object.values(totals).reduce((s, v) => s + v, 0);
  return Object.entries(totals)
    .map(([name, amount]) => ({
      name,
      total: Math.round(amount * 100) / 100,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
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
      const personalBalance = await getPersonalBalance(null, user.id);
      const personalReserved = await getPersonalReserved(null, user.id);
      const personalAvailable = personalBalance.balance - personalReserved;

      const lastTxs = await Transaction.findAll({
        where: { user_id: user.id, family_id: null },
        limit: 5,
        order: [['date', 'DESC'], ['id', 'DESC']],
        include: [{ model: User, as: 'User', attributes: ['id', 'name'] }, { model: require('../models').Category, as: 'Category', attributes: ['name'] }],
      });

      const goalWhere = { user_id: user.id, family_id: null };
      const activeGoals = await Goal.findAll({
        where: goalWhere,
        order: [['created_at', 'DESC']],
        limit: 3,
      });

      const allocation = await getAllocation(null, user.id, monthStartStr, todayStr, {});

      return res.json({
        family: null,
        personal: {
          balance: Number(personalBalance.balance),
          income: Number(personalBalance.income),
          expenses: Number(personalBalance.expense),
          reserved: Number(personalReserved),
          available: Number(personalAvailable),
          user_id: user.id,
        },
        lastTransactions: lastTxs,
        activeGoals,
        warning: null,
        allocation,
      });
    }

    const memberId = req.query.memberId ? Number(req.query.memberId) : null;
    const txWhere = { family_id: familyId };
    if (memberId) txWhere.user_id = memberId;

    const familyBalance = await getFamilyBalance(familyId);
    const familyReserved = await getFamilyReserved(familyId);
    const familyAvailable = familyBalance.balance - familyReserved;

    const personalBalance = await getPersonalBalance(familyId, user.id);
    const personalReserved = await getPersonalReserved(familyId, user.id);
    const personalAvailable = personalBalance.balance - personalReserved;

    const memberStats = await getMemberStats(familyId, user.id, monthStartStr, todayStr);

    const privacyFilter = { [Op.or]: [{ is_private: false }, { user_id: user.id }] };
    const monthIncome = await Transaction.sum('amount', { where: { family_id: familyId, type: 'income', date: { [Op.gte]: monthStartStr, [Op.lte]: todayStr }, ...privacyFilter } }) || 0;
    const monthExpenses = await Transaction.sum('amount', { where: { family_id: familyId, type: 'expense', date: { [Op.gte]: monthStartStr, [Op.lte]: todayStr }, ...privacyFilter } }) || 0;

    const personalMonthIncome = await Transaction.sum('amount', { where: { user_id: user.id, family_id: familyId, type: 'income', date: { [Op.gte]: monthStartStr, [Op.lte]: todayStr }, ...privacyFilter } }) || 0;
    const personalMonthExpenses = await Transaction.sum('amount', { where: { user_id: user.id, family_id: familyId, type: 'expense', date: { [Op.gte]: monthStartStr, [Op.lte]: todayStr }, ...privacyFilter } }) || 0;

    const lastTxs = await Transaction.findAll({
      where: txWhere,
      limit: 5,
      order: [['date', 'DESC'], ['id', 'DESC']],
      include: [{ model: User, as: 'User', attributes: ['id', 'name'] }, { model: require('../models').Category, as: 'Category', attributes: ['name'] }],
    });

    const goalWhere = memberId
      ? { user_id: memberId, [Op.or]: [{ family_id: familyId }, { family_id: null, user_id: memberId }] }
      : { [Op.or]: [{ family_id: familyId }, { user_id: user.id, family_id: null }] };

    const activeGoals = await Goal.findAll({
      where: { ...goalWhere, archived: false },
      order: [['created_at', 'DESC']],
      limit: 3,
    });

    const warningThreshold = 0.1;
    const warning = familyAvailable < familyBalance.balance * warningThreshold && familyAvailable > 0
      ? { type: 'low_funds', message: `Свободных средств осталось менее ${Math.round(warningThreshold * 100)}% от баланса`, available: Number(familyAvailable), threshold: Math.round(familyBalance.balance * warningThreshold) }
      : familyAvailable <= 0
      ? { type: 'no_funds', message: 'Свободные средства закончились', available: Number(familyAvailable) }
      : null;

    const allocation = await getAllocation(familyId, user.id, monthStartStr, todayStr, privacyFilter);

    res.json({
      family: {
        balance: Number(familyBalance.balance),
        income: Number(familyBalance.income),
        expenses: Number(familyBalance.expense),
        reserved: Number(familyReserved),
        available: Number(familyAvailable),
        monthIncome: Number(monthIncome),
        monthExpenses: Number(monthExpenses),
        memberStats,
      },
      personal: {
        balance: Number(personalBalance.balance),
        income: Number(personalBalance.income),
        expenses: Number(personalBalance.expense),
        reserved: Number(personalReserved),
        available: Number(personalAvailable),
        monthIncome: Number(personalMonthIncome),
        monthExpenses: Number(personalMonthExpenses),
        user_id: user.id,
      },
      lastTransactions: lastTxs,
      activeGoals,
      warning,
      viewingMemberId: memberId || null,
      allocation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.getAvailableFunds = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    if (!familyId) {
      const personalReserved = await getPersonalReserved(null, user.id);
      const { balance } = await getPersonalBalance(null, user.id);
      return res.json({ available: balance - personalReserved, reserved: personalReserved, balance });
    }

    const available = await getAvailableFunds(familyId);
    const reserved = await getFamilyReserved(familyId);
    const { balance } = await getFamilyBalance(familyId);
    const personalAvailable = await getPersonalAvailable(familyId, user.id);
    const personalReserved = await getPersonalReserved(familyId, user.id);

    res.json({
      available: Number(available),
      reserved: Number(reserved),
      balance: Number(balance),
      personalAvailable: Number(personalAvailable),
      personalReserved: Number(personalReserved),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
