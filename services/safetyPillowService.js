const prisma = require('../lib/prisma-client');

const PILLOW_LEVELS = {
  minimal: { months: 3, label: 'Минимальная', color: '#EF4444' },
  comfortable: { months: 6, label: 'Комфортная', color: '#F59E0B' },
  optimal: { months: 12, label: 'Оптимальная', color: '#10B981' },
};

async function calculateSafetyPillow(userId, familyId) {
  const isFamily = !!familyId;

  // Фильтрация с учётом scope
  // Личные транзакции (scope='personal'): family_id=null, user_id=self
  // Семейные транзакции (scope='family'/'shared'): family_id=familyId
  const txFilter = isFamily
    ? { OR: [{ family_id: familyId, scope: { in: ['family', 'shared'] } }, { family_id: null, user_id: userId, scope: 'personal' }] }
    : { family_id: null, user_id: userId, scope: 'personal' };

  const reserveFilter = isFamily
    ? { OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
    : { family_id: null, user_id: userId };

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const threeMonthExpensesAgg = await prisma.transaction.aggregate({
    where: { ...txFilter, type: 'expense', date: { gte: threeMonthsAgo } },
    _sum: { amount: true },
  });
  const totalExpenses = Number(threeMonthExpensesAgg._sum?.amount || 0);
  const monthlyAverage = totalExpenses / 3;

  // Liquid funds = sum of balances of liquid accounts
  const liquidAccounts = await prisma.account.findMany({
    where: {
      is_liquid: true,
      is_active: true,
      OR: isFamily
        ? [{ family_id: familyId }, { family_id: null, user_id: userId }]
        : [{ family_id: null, user_id: userId }]
    },
    select: { balance: true }
  });
  const liquidFunds = liquidAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  // Goals and wishes reserved
  const goalsAgg = await prisma.goal.aggregate({ where: reserveFilter, _sum: { current_amount: true } });
  const wishesAgg = await prisma.wish.aggregate({ where: reserveFilter, _sum: { saved_amount: true } });
  const totalGoals = (goalsAgg._sum && goalsAgg._sum.current_amount) ? goalsAgg._sum.current_amount : 0;
  const totalWishes = (wishesAgg._sum && wishesAgg._sum.saved_amount) ? wishesAgg._sum.saved_amount : 0;
  const reservedTotal = Number(totalGoals || 0) + Number(totalWishes || 0);

  // Получаем настройки - сначала семейные, потом личные
  let settings;
  if (isFamily) {
    settings = await prisma.safetyPillowSetting.findFirst({ where: { family_id: familyId } });
  }
  if (!settings) {
    settings = await prisma.safetyPillowSetting.findFirst({ where: { user_id: userId } });
  }
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

  const categoryExpenses = await prisma.transaction.findMany({
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
  
  const historyWhere = isFamily
    ? { family_id: familyId, calculated_at: { gte: twelveMonthsAgo } }
    : { user_id: userId, calculated_at: { gte: twelveMonthsAgo } };
  
  const history = await prisma.safetyPillowSnapshot.findMany({
    where: historyWhere,
    orderBy: { calculated_at: 'asc' },
    take: 12,
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
        ? `Откладывайте ${monthlyRecommendation} ₽/мес чтобы достичь подушки за ${months} мес`
        : 'Подушка безопасности уже сформирована!',
    },
    topCategories,
    history: history.map(h => ({
      id: h.id,
      value: Number(h.safety_pillow),
      target_value: Number(h.monthly_limit),
      calculated_at: h.calculated_at,
    })),
  };
}

async function recalculateAndSave(userId, familyId) {
  try {
    const result = await calculateSafetyPillow(userId, familyId);
    await prisma.safetyPillowHistory.create({
      data: {
        user_id: familyId ? null : userId,
        family_id: familyId || null,
        total_income: 0,
        total_expenses: 0,
        safety_pillow: result.liquidFunds,
        calculated_at: new Date(),
      }
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
