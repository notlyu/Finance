const prisma = require('../lib/prisma-client');

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
  const items = await prisma.recurringTransaction.findMany({
    where: {
      active: true,
      start_month: { lte: month },
      OR: [{ last_run_month: null }, { last_run_month: { lt: month } }],
    },
  });

  let totalCreated = 0;

  for (const r of items) {
    const lastRun = r.last_run_month || r.start_month;
    const monthsDiff = monthsBetween(lastRun, month);
    const monthsToProcess = Math.min(monthsDiff, 12);
    
    for (let i = 1; i <= monthsToProcess; i++) {
      const [ly, lm] = lastRun.split('-').map(Number);
      const targetDate = new Date(ly, lm - 1 + i, 1);
      const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const day = Math.min(r.day_of_month, 28);
      const date = new Date(`${targetMonth}-${String(day).padStart(2, '0')}T00:00:00.000Z`);

      await prisma.transaction.create({
        data: {
          user_id: r.user_id,
          family_id: r.family_id,
          amount: r.amount,
          type: r.type,
          category_id: r.category_id,
          date,
          comment: r.comment || 'Регулярная операция',
          is_private: !!r.is_private,
        }
      });
      totalCreated++;
    }

    await prisma.recurringTransaction.update({
      where: { id: r.id },
      data: { last_run_month: month }
    });
  }

  return { created: totalCreated };
}

module.exports = { runRecurringOnce };
