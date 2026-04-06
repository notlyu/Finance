const { Budget, Transaction, Category, User } = require('../models');
const { Op, fn, col } = require('sequelize');

function monthStartEnd(month) {
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

    const month = String(req.query.month || new Date().toISOString().slice(0, 7));
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Некорректный month (ожидается YYYY-MM)' });

    const memberId = req.query.memberId ? Number(req.query.memberId) : null;

    const { start, end } = monthStartEnd(month);

    let txWhere = familyId
      ? { family_id: familyId, date: { [Op.gte]: start, [Op.lt]: end } }
      : { family_id: null, user_id: user.id, date: { [Op.gte]: start, [Op.lt]: end } };

    const privacyFilter = { [Op.or]: [{ is_private: false }, { user_id: user.id }] };
    txWhere = { ...txWhere, ...privacyFilter };

    if (memberId) {
      txWhere.user_id = memberId;
    }

    const budgetWhere = familyId
      ? { family_id: familyId, month }
      : { family_id: null, user_id: user.id, month };

    const budgets = await Budget.findAll({
      where: budgetWhere,
      include: [
        { model: Category, as: 'Category', attributes: ['id', 'name', 'type'] },
        { model: User, as: 'User', attributes: ['id', 'name'] },
      ],
      order: [['type', 'ASC'], ['limit_amount', 'DESC']],
    });

    const actuals = await Transaction.findAll({
      where: txWhere,
      attributes: [
        'type', 'category_id', 'user_id',
        [fn('SUM', col('amount')), 'total'],
      ],
      group: ['type', 'category_id', 'user_id'],
      raw: true,
    });

    const actualMap = new Map();
    for (const a of actuals) {
      const key = `${a.type}:${a.category_id}`;
      if (!actualMap.has(key)) actualMap.set(key, {});
      actualMap.get(key)[a.user_id] = Number(a.total || 0);
    }

    const memberContributions = {};
    const members = familyId
      ? await User.findAll({ where: { family_id: familyId }, attributes: ['id', 'name'] })
      : [{ id: user.id, name: user.name }];

    members.forEach(m => { memberContributions[m.id] = { name: m.name, amount: 0 }; });

    for (const a of actuals) {
      if (memberContributions[a.user_id]) {
        memberContributions[a.user_id].amount += Number(a.total || 0);
      }
    }

    const items = budgets.map(b => {
      const key = `${b.type}:${b.category_id}`;
      const byMember = actualMap.get(key) || {};
      const total = Object.values(byMember).reduce((s, v) => s + v, 0);
      const limit = Number(b.limit_amount || 0);
      return {
        id: b.id,
        month: b.month,
        type: b.type,
        category_id: b.category_id,
        category_name: b.Category?.name || '',
        limit_amount: limit,
        actual_amount: total,
        progress: limit > 0 ? (total / limit) * 100 : 0,
        is_personal: !!b.is_personal,
        spent_by_members: members.map(m => ({
          userId: m.id,
          name: m.name,
          amount: byMember[m.id] || 0,
          percentage: total > 0 ? Math.round((byMember[m.id] || 0) / total * 100) : 0,
        })),
      };
    });

    res.json({ month, items, memberContributions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const { month, type = 'expense', category_id, limit_amount, is_personal } = req.body;
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return res.status(400).json({ message: 'Некорректный month (YYYY-MM)' });
    if (!['income', 'expense'].includes(type)) return res.status(400).json({ message: 'Некорректный type' });
    if (!category_id) return res.status(400).json({ message: 'category_id обязателен' });
    const limit = Number(limit_amount);
    if (!Number.isFinite(limit) || limit <= 0) return res.status(400).json({ message: 'limit_amount должен быть > 0' });

    const isPersonalBudget = is_personal || !familyId;
    const budget = await Budget.create({
      family_id: isPersonalBudget ? null : familyId,
      user_id: user.id,
      category_id,
      month,
      type,
      limit_amount: limit,
      is_personal: isPersonalBudget,
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
    const { id } = req.params;

    const budget = await Budget.findOne({
      where: familyId
        ? { id, [Op.or]: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id, family_id: null, user_id: user.id },
    });
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
    const { id } = req.params;

    const budget = await Budget.findOne({
      where: familyId
        ? { id, [Op.or]: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id, family_id: null, user_id: user.id },
    });
    if (!budget) return res.status(404).json({ message: 'Бюджет не найден' });

    await budget.destroy();
    res.json({ message: 'Бюджет удалён' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
