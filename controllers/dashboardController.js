const { Transaction, Goal, Wish, User } = require('../models');
const { Op } = require('sequelize');

function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

exports.getDashboard = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) return res.status(400).json({ message: 'Вы не состоите в семье' });

    // Filter by specific member if requested
    const memberId = req.query.memberId ? Number(req.query.memberId) : null;
    const txWhere = { family_id: familyId };
    if (memberId) txWhere.user_id = memberId;

    const today = new Date();
    const todayStr = toStr(today);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = toStr(monthStart);

    // 1) Last 5 operations
    const lastTxs = await Transaction.findAll({
      where: txWhere,
      limit: 5,
      order: [['date', 'DESC'], ['id','DESC']],
      include: [{ model: User, as: 'User', attributes: ['id','name'] }, { model: require('../models').Category, as: 'Category', attributes: ['name'] }],
    });

    // 2) Active goals progress (up to 3, non-archived)
    const goalWhere = { archived: false };
    if (memberId) {
      goalWhere.user_id = memberId;
    } else {
      goalWhere[Op.or] = [ { family_id: familyId }, { user_id: user.id, family_id: null } ];
    }
    const activeGoals = await Goal.findAll({
      where: goalWhere,
      order: [['created_at','DESC']],
      limit: 3
    });

    // 3) Current month income/expense — using string dates for DATEONLY comparison
    // Privacy: exclude other users' private transactions from totals
    const privacyFilter = { [Op.or]: [{ is_private: false }, { user_id: user.id }] };
    const monthTxWhere = { ...txWhere, date: { [Op.gte]: monthStartStr, [Op.lte]: todayStr }, ...privacyFilter };
    const inMonth = await Transaction.sum('amount', {
      where: { ...monthTxWhere, type: 'income' }
    }) || 0;
    const outMonth = await Transaction.sum('amount', {
      where: { ...monthTxWhere, type: 'expense' }
    }) || 0;

    // 4) All-time totals (filtered by member if selected, excluding other users' private)
    const allTimeTxWhere = { ...txWhere, ...privacyFilter };
    const totalIncomeAll = await Transaction.sum('amount', { where: { ...allTimeTxWhere, type: 'income' } }) || 0;
    const totalExpenseAll = await Transaction.sum('amount', { where: { ...allTimeTxWhere, type: 'expense' } }) || 0;
    const totalBalanceAll = Number(totalIncomeAll) - Number(totalExpenseAll);

    const goalsWhere = memberId ? { family_id: familyId, user_id: memberId } : { family_id: familyId };
    const wishesWhere = memberId ? { family_id: familyId, user_id: memberId } : { family_id: familyId };
    const totalGoalsCurrent = await Goal.sum('current_amount', { where: goalsWhere }) || 0;
    const totalWishesSaved = await Wish.sum('saved_amount', { where: wishesWhere }) || 0;
    const reservedTotal = Number(totalGoalsCurrent || 0) + Number(totalWishesSaved || 0);
    const availableFunds = totalBalanceAll - reservedTotal;

    res.json({
      lastTransactions: lastTxs,
      activeGoals,
      month: { income: Number(inMonth), expenses: Number(outMonth), diff: Number(inMonth) - Number(outMonth) },
      totalBalance: Number(totalBalanceAll),
      reservedTotal: Number(reservedTotal),
      availableFunds: Number(availableFunds),
      viewingMemberId: memberId || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
