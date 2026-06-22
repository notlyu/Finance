const prisma = require('../lib/prisma-client');

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

async function runInterestMonthly() {
  const monthKey = currentMonthKey();
  const [year, month] = monthKey.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // Защита от повторного запуска: проверяем, обрабатывали ли уже этот месяц
  const alreadyProcessed = await prisma.goalContribution.groupBy({
    by: ['goal_id'],
    where: {
      transaction_id: null,
      created_at: { gte: monthStart, lte: monthEnd },
    },
  });
  const processedGoalIds = new Set(alreadyProcessed.map(p => p.goal_id));

  const goals = await prisma.goal.findMany({
    where: { 
      interest_rate: { gt: 0 },
      NOT: { id: { in: [...processedGoalIds] } }
    }
  });

  let count = 0;
  for (const g of goals) {
    const monthlyRate = (parseFloat(g.interest_rate) || 0) / 100 / 12;
    if (monthlyRate <= 0) continue;
    const current = parseFloat(g.current_amount || 0);
    if (current <= 0) continue;
    const interestAmount = current * monthlyRate;
    if (!interestAmount || interestAmount <= 0) continue;

    await prisma.goalContribution.create({
      data: {
        goal_id: g.id,
        user_id: g.user_id,
        amount: interestAmount,
        transaction_id: null,
      }
    });

    await prisma.goal.update({
      where: { id: g.id },
      data: { current_amount: current + interestAmount }
    });
    count += 1;
  }

  return { processed: count, month: monthKey };
}

module.exports = { runInterestMonthly };
