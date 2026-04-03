const { Goal, GoalContribution } = require('../models');
const { Op } = require('sequelize');

// Monthly interest accrual for goals with interest_rate > 0
async function runInterestMonthly() {
  const now = new Date();
  // Fetch all goals with a non-null interest_rate > 0
  const goals = await Goal.findAll({ where: { interest_rate: { [Op.gt]: 0 } } });

  let count = 0;
  for (const g of goals) {
    const monthlyRate = (parseFloat(g.interest_rate) || 0) / 100 / 12;
    if (monthlyRate <= 0) continue;
    // Calculate interest on current_amount
    const current = parseFloat(g.current_amount || 0);
    if (current <= 0) continue;
    const interestAmount = current * monthlyRate;
    if (!interestAmount || interestAmount <= 0) continue;

    // Create a history record as interest contribution
    await GoalContribution.create({
      goal_id: g.id,
      amount: interestAmount,
      date: now,
      type: 'interest',
      automatic: false
    });

    // Update current amount of the goal
    await g.update({ current_amount: current + interestAmount });
    count += 1;
  }

  return { processed: count };
}

module.exports = { runInterestMonthly };
