const { Budget, Transaction, Category } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

function monthStartEnd(month) {
  // month: YYYY-MM
  const [y, m] = String(month).split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

exports.getBudgets = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) return res.status(400).json({ message: 'Вы не состоите в семье' });

    const month = String(req.query.month || new Date().toISOString().slice(0, 7));
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Некорректный month (ожидается YYYY-MM)' });

    const { start, end } = monthStartEnd(month);
    const includePrivate = String(req.query.includePrivate || 'all');

    const txWhere = {
      family_id: familyId,
      date: { [Op.gte]: start, [Op.lt]: end },
    };
    if (includePrivate === 'only_visible') {
      txWhere[Op.or] = [{ is_private: false }, { user_id: user.id }];
    } else if (includePrivate === 'only_private') {
      txWhere.is_private = true;
      txWhere.user_id = user.id;
    } else {
      // all: still don't include other users' private in totals
      txWhere[Op.or] = [{ is_private: false }, { user_id: user.id }];
    }

    const budgets = await Budget.findAll({
      where: { family_id: familyId, month },
      include: [{ model: Category, as: 'Category', attributes: ['id', 'name', 'type'] }],
      order: [['type', 'ASC'], ['limit_amount', 'DESC']],
    });

    // Actuals grouped by category/type for the month
    const actuals = await Transaction.findAll({
      where: txWhere,
      attributes: [
        'type',
        'category_id',
        [fn('SUM', col('amount')), 'total'],
      ],
      group: ['type', 'category_id'],
      raw: true,
    });

    const actualMap = new Map();
    for (const a of actuals) {
      actualMap.set(`${a.type}:${a.category_id}`, Number(a.total || 0));
    }

    const items = budgets.map(b => {
      const key = `${b.type}:${b.category_id}`;
      const actual = actualMap.get(key) || 0;
      const limit = Number(b.limit_amount || 0);
      return {
        id: b.id,
        month: b.month,
        type: b.type,
        category_id: b.category_id,
        category_name: b.Category?.name || '',
        limit_amount: limit,
        actual_amount: actual,
        progress: limit > 0 ? (actual / limit) * 100 : 0,
      };
    });

    res.json({ month, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) return res.status(400).json({ message: 'Вы не состоите в семье' });

    const { month, type = 'expense', category_id, limit_amount } = req.body;
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return res.status(400).json({ message: 'Некорректный month (YYYY-MM)' });
    if (!['income', 'expense'].includes(type)) return res.status(400).json({ message: 'Некорректный type' });
    if (!category_id) return res.status(400).json({ message: 'category_id обязателен' });
    const limit = Number(limit_amount);
    if (!Number.isFinite(limit) || limit <= 0) return res.status(400).json({ message: 'limit_amount должен быть > 0' });

    const budget = await Budget.create({
      family_id: familyId,
      user_id: user.id,
      category_id,
      month,
      type,
      limit_amount: limit,
    });
    res.status(201).json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) return res.status(400).json({ message: 'Вы не состоите в семье' });

    const { id } = req.params;
    const budget = await Budget.findOne({ where: { id, family_id: familyId } });
    if (!budget) return res.status(404).json({ message: 'Бюджет не найден' });

    const limit = Number(req.body.limit_amount);
    if (!Number.isFinite(limit) || limit <= 0) return res.status(400).json({ message: 'limit_amount должен быть > 0' });

    await budget.update({ limit_amount: limit, updated_at: new Date() });
    res.json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) return res.status(400).json({ message: 'Вы не состоите в семье' });

    const { id } = req.params;
    const budget = await Budget.findOne({ where: { id, family_id: familyId } });
    if (!budget) return res.status(404).json({ message: 'Бюджет не найден' });

    await budget.destroy();
    res.json({ message: 'Бюджет удалён' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

