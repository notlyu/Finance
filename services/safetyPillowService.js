const { Transaction, Goal, Wish, SafetyPillowSetting, SafetyPillowHistory } = require('../models');
const { Op } = require('sequelize');

// Core calculation for safety pillow (same logic as existing controller)
async function calculateSafetyPillow(userId, familyId) {
  // 1. Среднемесячные расходы за последние 3 месяца
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const expenses = await Transaction.findAll({
    where: {
      family_id: familyId,
      type: 'expense',
      date: { [Op.gte]: threeMonthsAgo }
    },
    attributes: ['amount']
  });
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const monthlyAverage = totalExpenses / 3;

  // 2. Свободные средства: сумма всех доходов минус расходы
  const allTransactions = await Transaction.findAll({ where: { family_id: familyId }, attributes: ['type', 'amount'] });
  let freeFunds = 0;
  for (const t of allTransactions) {
    if (t.type === 'income') freeFunds += parseFloat(t.amount);
    else freeFunds -= parseFloat(t.amount);
  }

  // 3. Накопления на целях и желаниях
  const goals = await Goal.findAll({ where: { family_id: familyId }, attributes: ['current_amount', 'interest_rate', 'target_amount'] });
  const wishes = await Wish.findAll({ where: { family_id: familyId }, attributes: ['saved_amount'] });
  const totalGoals = goals.reduce((sum, g) => sum + parseFloat(g.current_amount), 0);
  const totalWishes = wishes.reduce((sum, w) => sum + parseFloat(w.saved_amount), 0);

  const totalFunds = freeFunds + totalGoals + totalWishes;

  // 4. Настройки пользователя
  const settings = await SafetyPillowSetting.findOne({ where: { user_id: userId } });
  const months = settings ? settings.months : 3;
  const target = monthlyAverage * months;

  return {
    current: totalFunds,
    target,
    monthlyAverage,
    progress: target > 0 ? (totalFunds / target) * 100 : 0
  };
}

async function recalculateAndSave(userId, familyId) {
  try {
    const result = await calculateSafetyPillow(userId, familyId);
    await SafetyPillowHistory.create({
      user_id: userId,
      value: result.current,
      target_value: result.target,
      calculated_at: new Date()
    });
    return result;
  } catch (error) {
    console.error('Safety pillow recalculation error:', error);
  }
}

module.exports = {
  calculateSafetyPillow,
  recalculateAndSave
};
