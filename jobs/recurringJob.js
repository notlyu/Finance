const { RecurringTransaction, Transaction } = require('../models');
const { Op } = require('sequelize');

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthGte(a, b) {
  // compare YYYY-MM strings
  return String(a) >= String(b);
}

async function runRecurringOnce() {
  const month = currentMonth();
  const items = await RecurringTransaction.findAll({
    where: {
      active: true,
      start_month: { [Op.lte]: month },
      [Op.or]: [{ last_run_month: null }, { last_run_month: { [Op.lt]: month } }],
    },
  });

  for (const r of items) {
    // Create one transaction per month on configured day (safe 1..28)
    const date = `${month}-${String(r.day_of_month).padStart(2, '0')}`;
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
    await r.update({ last_run_month: month, updated_at: new Date() });
  }

  return { created: items.length };
}

module.exports = { runRecurringOnce };

