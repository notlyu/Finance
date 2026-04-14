const prisma = require('../lib/prisma-client');

// Monthly interest accrual for goals with interest_rate > 0
async function runInterestMonthly() {
  const now = new Date();
  const goals = await prisma.goal.findMany({
    where: { interest_rate: { gt: 0 } }
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

  return { processed: count };
}

module.exports = { runInterestMonthly };
