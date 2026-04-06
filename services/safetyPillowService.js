const { Transaction, Goal, Wish, SafetyPillowSetting, SafetyPillowHistory, User } = require('../models');
const { Op } = require('sequelize');

const PILLOW_LEVELS = {
  minimal: { months: 3, label: 'Минимальная', color: '#EF4444' },
  comfortable: { months: 6, label: 'Комфортная', color: '#F59E0B' },
  optimal: { months: 12, label: 'Оптимальная', color: '#10B981' },
};

async function calculateSafetyPillow(userId, familyId) {
  const isFamily = !!familyId;
  const txFilter = isFamily
    ? { [Op.or]: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
    : { family_id: null, user_id: userId };
  const reserveFilter = isFamily
    ? { [Op.or]: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
    : { family_id: null, user_id: userId };

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().slice(0, 10);

  const expenses = await Transaction.findAll({
    where: { ...txFilter, type: 'expense', date: { [Op.gte]: threeMonthsAgoStr } },
    attributes: ['amount'],
  });
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const monthlyAverage = totalExpenses / 3;

  const totalIncomeAll = await Transaction.sum('amount', { where: { ...txFilter, type: 'income' } }) || 0;
  const totalExpenseAll = await Transaction.sum('amount', { where: { ...txFilter, type: 'expense' } }) || 0;
  const liquidFunds = Number(totalIncomeAll) - Number(totalExpenseAll);

  const totalGoals = await Goal.sum('current_amount', { where: reserveFilter }) || 0;
  const totalWishes = await Wish.sum('saved_amount', { where: reserveFilter }) || 0;
  const reservedTotal = Number(totalGoals || 0) + Number(totalWishes || 0);

  const settings = await SafetyPillowSetting.findOne({ where: { user_id: userId } });
  const months = settings ? settings.months : 3;
  const target = monthlyAverage * months;

  const levels = {};
  for (const [key, level] of Object.entries(PILLOW_LEVELS)) {
    levels[key] = {
      ...level,
      target: monthlyAverage * level.months,
      progress: monthlyAverage > 0 ? Math.min(100, (liquidFunds / (monthlyAverage * level.months)) * 100) : 0,
      reached: liquidFunds >= monthlyAverage * level.months,
    };
  }

  const shortfall = Math.max(0, target - liquidFunds);
  const monthlyRecommendation = months > 0 ? Math.ceil(shortfall / months) : 0;

  const categoryExpenses = await Transaction.findAll({
    where: { ...txFilter, type: 'expense', date: { [Op.gte]: threeMonthsAgoStr } },
    include: [{ model: require('../models').Category, as: 'Category', attributes: ['name'] }],
    attributes: ['amount'],
    raw: true,
  });

  const byCategory = {};
  categoryExpenses.forEach(t => {
    const cat = t['Category.name'] || 'Без категории';
    byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount);
  });
  const topCategories = Object.entries(byCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const history = await SafetyPillowHistory.findAll({
    where: { user_id: userId, calculated_at: { [Op.gte]: twelveMonthsAgo } },
    order: [['calculated_at', 'ASC']],
    limit: 12,
  });

  return {
    liquidFunds: Math.round(liquidFunds * 100) / 100,
    reservedTotal: Math.round(reservedTotal * 100) / 100,
    monthlyAverage: Math.round(monthlyAverage * 100) / 100,
    target: Math.round(target * 100) / 100,
    months,
    progress: target > 0 ? Math.min(100, (liquidFunds / target) * 100) : 0,
    isFamily,
    levels,
    recommendation: {
      monthlyAmount: monthlyRecommendation,
      monthsToTarget: months,
      shortfall: Math.round(shortfall * 100) / 100,
      message: shortfall > 0
        ? `Откладывайте ${monthlyRecommendation} ₽/мес чтобы достичь подушки за 6 мес`
        : 'Подушка безопасности уже сформирована!',
    },
    topCategories,
    history: history.map(h => ({
      value: Number(h.value),
      target_value: Number(h.target_value),
      calculated_at: h.calculated_at,
    })),
  };
}

async function recalculateAndSave(userId, familyId) {
  try {
    const result = await calculateSafetyPillow(userId, familyId);
    await SafetyPillowHistory.create({
      user_id: userId,
      value: result.liquidFunds,
      target_value: result.target,
      calculated_at: new Date(),
    });
    return result;
  } catch (error) {
    console.error('Safety pillow recalculation error:', error);
  }
}

module.exports = {
  calculateSafetyPillow,
  recalculateAndSave,
  PILLOW_LEVELS,
};
