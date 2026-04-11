const { Transaction, Goal, Wish, SafetyPillowSetting, SafetyPillowHistory, User } = require('../lib/models');
const { Op, prisma } = require('../lib/models');

const PILLOW_LEVELS = {
  minimal: { months: 3, label: 'Минимальная', color: '#EF4444' },
  comfortable: { months: 6, label: 'Комфортная', color: '#F59E0B' },
  optimal: { months: 12, label: 'Оптимальная', color: '#10B981' },
};

async function calculateSafetyPillow(userId, familyId) {
  const isFamily = !!familyId;
  const txFilter = isFamily
    ? { OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
    : { family_id: null, user_id: userId };
  const reserveFilter = isFamily
    ? { OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
    : { family_id: null, user_id: userId };

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // Get expenses for last 3 months using Prisma
  const expenses = await prisma.transaction.findMany({
    where: { ...txFilter, type: 'expense', date: { gte: threeMonthsAgo } },
  });
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const monthlyAverage = totalExpenses / 3;

  // Total income/expense
  const incomeAgg = await prisma.transaction.aggregate({
    where: { ...txFilter, type: 'income' },
    _sum: { amount: true }
  });
  const expenseAgg = await prisma.transaction.aggregate({
    where: { ...txFilter, type: 'expense' },
    _sum: { amount: true }
  });
  const totalIncomeAll = incomeAgg._sum && incomeAgg._sum.amount != null ? incomeAgg._sum.amount : 0;
  const totalExpenseAll = expenseAgg._sum && expenseAgg._sum.amount != null ? expenseAgg._sum.amount : 0;
  const liquidFunds = Number(totalIncomeAll) - Number(totalExpenseAll);

  // Goals and wishes reserved
  const goalsAgg = await prisma.goal.aggregate({ where: reserveFilter, _sum: { current_amount: true } });
  const wishesAgg = await prisma.wish.aggregate({ where: reserveFilter, _sum: { saved_amount: true } });
  const totalGoals = (goalsAgg._sum && goalsAgg._sum.current_amount) ? goalsAgg._sum.current_amount : 0;
  const totalWishes = (wishesAgg._sum && wishesAgg._sum.saved_amount) ? wishesAgg._sum.saved_amount : 0;
  const reservedTotal = Number(totalGoals || 0) + Number(totalWishes || 0);

  const settings = await prisma.safetyPillowSetting.findFirst({ where: { user_id: userId } });
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
    where: { ...txFilter, type: 'expense', date: { gte: threeMonthsAgo } },
    include: { category: true },
  });

  const byCategory = {};
  categoryExpenses.forEach(t => {
    const cat = t.category?.name || 'Без категории';
    byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount);
  });
  const topCategories = Object.entries(byCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const history = await SafetyPillowHistory.findAll({
    where: { user_id: userId, calculated_at: { gte: twelveMonthsAgo } },
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
       value: Number(h.safety_pillow),
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
      total_income: result.totalIncome || 0,
      total_expenses: result.totalExpense || 0,
      safety_pillow: result.liquidFunds,
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
