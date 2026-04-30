const prisma = require('../lib/prisma-client');

async function runSnapshotMonthly() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const users = await prisma.user.findMany({
    include: { family: true }
  });

  const families = await prisma.family.findMany();

  let personalCount = 0;
  let familyCount = 0;

  for (const user of users) {
    const result = await calculateForUser(user.id, user.family_id);
    if (result) {
      await prisma.safetyPillowSnapshot.create({
        data: {
          user_id: user.id,
          family_id: null,
          total_income: result.total_income,
          total_expenses: result.total_expenses,
          safety_pillow: result.safety_pillow,
          monthly_limit: result.monthly_limit,
        }
      });
      personalCount++;
    }
  }

  for (const family of families) {
    const result = await calculateForFamily(family.id);
    if (result) {
      await prisma.safetyPillowSnapshot.create({
        data: {
          user_id: null,
          family_id: family.id,
          total_income: result.total_income,
          total_expenses: result.total_expenses,
          safety_pillow: result.safety_pillow,
          monthly_limit: result.monthly_limit,
        }
      });
      familyCount++;
    }
  }

  return { personal: personalCount, family: familyCount };
}

async function calculateForUser(userId, familyId) {
  const txFilter = familyId
    ? { OR: [{ family_id: familyId, is_personal: false }, { family_id: null, user_id: userId, is_personal: true }] }
    : { family_id: null, user_id: userId, is_personal: true };

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const expenseAgg = await prisma.transaction.aggregate({
    where: { ...txFilter, type: 'expense', date: { gte: threeMonthsAgo } },
    _sum: { amount: true },
  });
  const totalExpenses = Number(expenseAgg._sum?.amount || 0);
  const monthlyAverage = totalExpenses / 3;

  const incomeAgg = await prisma.transaction.aggregate({
    where: { ...txFilter, type: 'income' },
    _sum: { amount: true },
  });
  const totalIncome = Number(incomeAgg._sum?.amount || 0);
  const liquidFunds = totalIncome - totalExpenses;

  const settings = await prisma.safetyPillowSetting.findFirst({
    where: { user_id: userId }
  });
  const months = settings?.months || 3;

  return {
    total_income: totalIncome,
    total_expenses: totalExpenses,
    safety_pillow: liquidFunds,
    monthly_limit: months * monthlyAverage,
  };
}

async function calculateForFamily(familyId) {
  const txFilter = { family_id: familyId, is_personal: false };

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const expenseAgg = await prisma.transaction.aggregate({
    where: { ...txFilter, type: 'expense', date: { gte: threeMonthsAgo } },
    _sum: { amount: true },
  });
  const totalExpenses = Number(expenseAgg._sum?.amount || 0);
  const monthlyAverage = totalExpenses / 3;

  const incomeAgg = await prisma.transaction.aggregate({
    where: { ...txFilter, type: 'income' },
    _sum: { amount: true },
  });
  const totalIncome = Number(incomeAgg._sum?.amount || 0);
  const liquidFunds = totalIncome - totalExpenses;

  const settings = await prisma.safetyPillowSetting.findFirst({
    where: { family_id: familyId }
  });
  const months = settings?.months || 3;

  return {
    total_income: totalIncome,
    total_expenses: totalExpenses,
    safety_pillow: liquidFunds,
    monthly_limit: months * monthlyAverage,
  };
}

module.exports = { runSnapshotMonthly };