const { Transaction, Category } = require('../models');
const { Op } = require('sequelize');

// Динамика доходов и расходов по месяцам
exports.getDynamics = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const { period = 'month' } = req.query; // month, quarter, year
    // Для простоты реализуем только помесячно за последние 12 месяцев
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const transactions = await Transaction.findAll({
      where: {
        family_id: familyId,
        date: { [Op.gte]: startDate },
      },
      attributes: ['amount', 'type', 'date'],
      order: [['date', 'ASC']],
    });

    const months = [];
    const incomeByMonth = {};
    const expenseByMonth = {};

    for (let i = 0; i < 12; i++) {
      const d = new Date(startDate);
      d.setMonth(startDate.getMonth() + i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      months.push(key);
      incomeByMonth[key] = 0;
      expenseByMonth[key] = 0;
    }

    transactions.forEach(t => {
      const key = `${t.date.getFullYear()}-${t.date.getMonth() + 1}`;
      if (t.type === 'income') {
        incomeByMonth[key] += parseFloat(t.amount);
      } else {
        expenseByMonth[key] += parseFloat(t.amount);
      }
    });

    res.json({
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