const { Transaction, Category } = require('../models');
const { Op, fn, col } = require('sequelize');

function toMonthKeyFromDateOnly(dateOnly) {
  // Transaction.date is DATEONLY and may come as string 'YYYY-MM-DD' (or Date depending on dialect/options).
  const d = dateOnly instanceof Date ? dateOnly : new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

// Динамика доходов и расходов по месяцам
exports.getDynamics = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const startDate = req.query.startDate ? String(req.query.startDate) : null;
    const endDate = req.query.endDate ? String(req.query.endDate) : null;

    let start = startDate;
    let end = endDate;
    if (!start || !end) {
      const now = new Date();
      const s = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      start = s.toISOString().slice(0, 10);
      end = e.toISOString().slice(0, 10);
    }

    const rows = await Transaction.findAll({
      where: {
        family_id: familyId,
        date: { [Op.gte]: start, [Op.lt]: end },
        [Op.or]: [{ is_private: false }, { user_id: user.id }], // don't leak other users' private
      },
      attributes: [
        [fn('DATE_FORMAT', col('date'), '%Y-%m'), 'month'],
        'type',
        [fn('SUM', col('amount')), 'total'],
      ],
      group: ['month', 'type'],
      order: [[col('month'), 'ASC']],
      raw: true,
    });

    const months = [];
    const incomeByMonth = {};
    const expenseByMonth = {};

    // Build month list inclusively from start to end-1month
    const startD = new Date(`${start}T00:00:00`);
    const endD = new Date(`${end}T00:00:00`);
    const cursor = new Date(startD.getFullYear(), startD.getMonth(), 1);
    const endCursor = new Date(endD.getFullYear(), endD.getMonth(), 1);
    while (cursor < endCursor) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      months.push(key);
      incomeByMonth[key] = 0;
      expenseByMonth[key] = 0;
      cursor.setMonth(cursor.getMonth() + 1);
    }

    rows.forEach(r => {
      const key = r.month;
      if (!incomeByMonth.hasOwnProperty(key)) return;
      const val = parseFloat(r.total || 0);
      if (r.type === 'income') incomeByMonth[key] += val;
      else expenseByMonth[key] += val;
    });

    res.json({
      startDate: start,
      endDate: end,
      labels: months.map(m => {
        const [year, month] = m.split('-');
        return `${month}.${year}`;
      }),
      income: months.map(m => incomeByMonth[m]),
      expense: months.map(m => expenseByMonth[m]),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Расходы по категориям
exports.getExpensesByCategory = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const { startDate, endDate } = req.query;
    const where = { family_id: familyId, type: 'expense' };
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    const transactions = await Transaction.findAll({
      where,
      include: [{ model: Category, as: 'Category', attributes: ['name'] }],
      attributes: ['amount', 'category_id'],
    });

    const categoryTotals = {};
    transactions.forEach(t => {
      const catName = t.Category ? t.Category.name : 'Без категории';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(t.amount);
    });

    const data = Object.entries(categoryTotals).map(([name, total]) => ({ name, total }));
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Доходы по категориям (аналогично)
exports.getIncomeByCategory = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const { startDate, endDate } = req.query;
    const where = { family_id: familyId, type: 'income' };
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    const transactions = await Transaction.findAll({
      where,
      include: [{ model: Category, as: 'Category', attributes: ['name'] }],
      attributes: ['amount', 'category_id'],
    });

    const categoryTotals = {};
    transactions.forEach(t => {
      const catName = t.Category ? t.Category.name : 'Без категории';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(t.amount);
    });

    const data = Object.entries(categoryTotals).map(([name, total]) => ({ name, total }));
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};