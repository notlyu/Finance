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
  
  // Защита от двойного запуска: проверяем, что last_run_month ещё не текущий месяц
  const items = await prisma.recurringTransaction.findMany({
    where: {
      active: true,
      start_month: { lte: month },
      OR: [{ last_run_month: null }, { last_run_month: { lt: month } }],
    },
  });

  let totalCreated = 0;
  const errors = [];

  for (const r of items) {
    // Дополнительная проверка: если last_run_month уже текущий месяц, пропускаем
    if (r.last_run_month === month) continue;
    
    try {
      const lastRun = r.last_run_month || r.start_month;
      const monthsDiff = monthsBetween(lastRun, month);
      const monthsToProcess = Math.min(monthsDiff, 12);
        
      for (let i = 1; i <= monthsToProcess; i++) {
        const [ly, lm] = lastRun.split('-').map(Number);
        const targetDate = new Date(ly, lm - 1 + i, 1);
        const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        const day = Math.min(r.day_of_month, 28);
        const txDate = new Date(`${targetMonth}-${String(day).padStart(2, '0')}T00:00:00.000Z`);

        // Проверяем, не создана ли уже транзакция за этот месяц
        const existing = await prisma.transaction.findFirst({
          where: {
            user_id: r.user_id,
            category_id: r.category_id,
            type: r.type,
            amount: r.amount,
            date: txDate,
            comment: r.comment || 'Регулярная операция',
          }
        });

        if (!existing) {
          let txAmount = Number(r.amount);

          if (r.goal_id) {
            const goal = await prisma.goal.findUnique({ where: { id: r.goal_id } });
            if (goal && goal.auto_contribute_type === 'percentage' && goal.auto_contribute_value) {
              const percent = Number(goal.auto_contribute_value) / 100;
              const prevMonth = new Date(txDate.getFullYear(), txDate.getMonth() - 1, 1);
              const prevMonthEnd = new Date(txDate.getFullYear(), txDate.getMonth(), 0);
              const incomeAgg = await prisma.transaction.aggregate({
                where: { 
                  user_id: r.user_id, 
                  family_id: r.family_id, 
                  type: 'income',
                  date: { gte: prevMonth, lte: prevMonthEnd }
                },
                _sum: { amount: true }
              });
              const totalIncome = Number(incomeAgg._sum?.amount || 0);
              txAmount = Math.round(totalIncome * percent * 100) / 100;
            }
          }

          if (txAmount > 0) {
            // Используем транзакцию БД для атомарности
            const tx = await prisma.transaction.create({
              data: {
                user_id: r.user_id,
                family_id: r.family_id,
                account_id: r.account_id, // Используем account_id из шаблона
                amount: txAmount,
                type: r.type,
                category_id: r.category_id,
                date: txDate,
                comment: r.comment || 'Регулярная операция',
                scope: r.scope || (r.family_id ? 'family' : 'personal'),
              }
            });
            totalCreated++;

            if (r.goal_id) {
              const goal = await prisma.goal.findUnique({ where: { id: r.goal_id } });
              if (goal && !goal.is_archived) {
                await prisma.goalContribution.create({
                  data: {
                    goal_id: r.goal_id,
                    user_id: r.user_id,
                    amount: txAmount,
                    transaction_id: tx.id,
                  }
                });

                const newCurrentAmount = parseFloat(goal.current_amount) + txAmount;
                const reached = newCurrentAmount >= parseFloat(goal.target_amount);
                
                await prisma.goal.update({
                  where: { id: r.goal_id },
                  data: { 
                    current_amount: newCurrentAmount,
                    ...(reached ? { is_archived: true, archived_at: new Date() } : {})
                  }
                });
              }
            }
          }
        }
      }

      // Обновляем last_run_month только после успешной обработки
      await prisma.recurringTransaction.update({
        where: { id: r.id },
        data: { last_run_month: month }
      });
    } catch (error) {
      errors.push({ recurringId: r.id, error: error.message });
    }
  }

  return { created: totalCreated, errors };
}

module.exports = { runRecurringOnce };
