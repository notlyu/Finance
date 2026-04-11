const { RecurringTransaction, Transaction } = require('../lib/models');
const { Op } = require('../lib/models');

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthsBetween(startMonth, endMonth) {
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm);
}

async function runRecurringOnce() {
  const month = currentMonth();
  const items = await RecurringTransaction.findAll({
   where: {
     active: true,
     start_month: { lte: month },
     OR: [{ last_run_month: null }, { last_run_month: { lt: month } }],
   },
  });

  let totalCreated = 0;

  for (const r of items) {
    // Calculate how many months to process
    const lastRun = r.last_run_month || r.start_month;
    const monthsDiff = monthsBetween(lastRun, month);
    
    // Process each missed month (cap at 12 to avoid flooding)
    const monthsToProcess = Math.min(monthsDiff, 12);
    
    for (let i = 1; i <= monthsToProcess; i++) {
      // Calculate target month
      const [ly, lm] = lastRun.split('-').map(Number);
      const targetDate = new Date(ly, lm - 1 + i, 1);
      const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const day = Math.min(r.day_of_month, 28); // Safe day
      const date = `${targetMonth}-${String(day).padStart(2, '0')}`;

      await Transaction.create({
        user_id: r.user_id,
        family_id: r.family_id,
        amount: r.amount,
        type: r.type,
        category_id: r.category_id,
        date,
        comment: r.comment || 'Регулярная операция',
        is_private: !!r.is_private,
      });
      totalCreated++;
    }

    // Update last_run_month to current month
    await r.update({ last_run_month: month, updated_at: new Date() });
  }

  return { created: totalCreated };
}

module.exports = { runRecurringOnce };
