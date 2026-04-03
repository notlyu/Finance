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

    const today = new Date();
    const todayStr = toStr(today);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = toStr(monthStart);

    // 1) Last 5 operations
    const lastTxs = await Transaction.findAll({
      where: { family_id: familyId },
      limit: 5,
      order: [['date', 'DESC'], ['id','DESC']],
      include: [{ model: User, as: 'User', attributes: ['id','name'] }, { model: require('../models').Category, as: 'Category', attributes: ['name'] }],
    });

    // 2) Active goals progress (up to 3, non-archived)
    const activeGoals = await Goal.findAll({
      where: {
        archived: false,
        [Op.or]: [ { family_id: familyId }, { user_id: user.id, family_id: null } ],
      },
      order: [['created_at','DESC']],
      limit: 3
    });

    // 3) Current month income/expense — using string dates for DATEONLY comparison
    const inMonth = await Transaction.sum('amount', {
      where: { family_id: familyId, type: 'income', date: { [Op.gte]: monthStartStr, [Op.lte]: todayStr } }
    }) || 0;
    const outMonth = await Transaction.sum('amount', {
      where: { family_id: familyId, type: 'expense', date: { [Op.gte]: monthStartStr, [Op.lte]: todayStr } }
    }) || 0;

    // 4) All-time totals
    const totalIncomeAll = await Transaction.sum('amount', { where: { family_id: familyId, type: 'income' } }) || 0;
    const totalExpenseAll = await Transaction.sum('amount', { where: { family_id: familyId, type: 'expense' } }) || 0;
    const totalBalanceAll = Number(totalIncomeAll) - Number(totalExpenseAll);

    const totalGoalsCurrent = await Goal.sum('current_amount', { where: { family_id: familyId } }) || 0;
    const totalWishesSaved = await Wish.sum('saved_amount', { where: { family_id: familyId } }) || 0;
    const reservedTotal = Number(totalGoalsCurrent || 0) + Number(totalWishesSaved || 0);
    const availableFunds = totalBalanceAll - reservedTotal;

    res.json({
      lastTransactions: lastTxs,
      activeGoals,
      month: { income: Number(inMonth), expenses: Number(outMonth), diff: Number(inMonth) - Number(outMonth) },
      totalBalance: Number(totalBalanceAll),
      reservedTotal: Number(reservedTotal),
      availableFunds: Number(availableFunds)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
