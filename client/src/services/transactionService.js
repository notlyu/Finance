const { Op } = require('sequelize');
const { Transaction, Category, User, Goal, GoalContribution, sequelize } = require('../models');
const safetyPillowService = require('./safetyPillowService'); // Rename your old controller to Service

const prepareTransactionForUser = (transaction, currentUserId) => {
  const isOwner = transaction.user_id === currentUserId;
  if (!isOwner && transaction.is_private) {
    return {
      id: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date,
      is_private: true,
      is_hidden: true,
      user_id: transaction.user_id,
      user_name: transaction.User?.name,
      category_name: 'Скрытая операция',
      comment: 'Сюрприз',
    };
  }
  return {
    id: transaction.id,
    amount: transaction.amount,
    type: transaction.type,
    date: transaction.date,
    comment: transaction.comment,
    is_private: transaction.is_private,
    user_id: transaction.user_id,
    user_name: transaction.User?.name,
    category_id: transaction.category_id,
    category_name: transaction.Category?.name,
    category_type: transaction.Category?.type,
  };
};

exports.getTransactions = async (userId, familyId, query) => {
  const { page = 1, limit = 20, type, categoryId } = query;
  
  const where = { 
    family_id: familyId,
    [Op.or]: [
      { is_private: false },
      { is_private: true, user_id: userId }
    ]
  };

  if (type) where.type = type;
  if (categoryId) where.category_id = categoryId;

  const { count, rows } = await Transaction.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['date', 'DESC']],
    include: [
      { model: User, as: 'User', attributes: ['id', 'name'] },
      { model: Category, as: 'Category', attributes: ['id', 'name', 'type'] }
    ]
  });

  return {
    data: rows.map(t => prepareTransactionForUser(t, userId)),
    meta: { total: count, page: parseInt(page), limit: parseInt(limit) }
  };
};

exports.createTransaction = async (userId, familyId, data) => {
  const t = await sequelize.transaction();
  try {
    const { amount, type, category_id, date, comment, is_private } = data;

    const transaction = await Transaction.create({
      user_id: userId,
      family_id: familyId,
      amount, type, category_id,
      date: date || new Date(),
      comment,
      is_private: !!is_private
    }, { transaction: t });

    if (type === 'income') {
      const userGoals = await Goal.findAll({
        where: {
          [Op.or]: [{ user_id: userId, family_id: null }, { family_id: familyId }],
          auto_contribute_enabled: true
        },
        transaction: t
      });

      for (const goal of userGoals) {
        let contributionAmount = 0;
        if (goal.auto_contribute_type === 'percentage') {
          contributionAmount = (amount * goal.auto_contribute_value) / 100;
        } else if (goal.auto_contribute_type === 'fixed') {
          contributionAmount = goal.auto_contribute_value;
        }

        if (contributionAmount > 0) {
          await GoalContribution.create({
            goal_id: goal.id,
            amount: contributionAmount,
            date: date || new Date(),
            transaction_id: transaction.id
          }, { transaction: t });
          
          await goal.update({
            current_amount: parseFloat(goal.current_amount) + contributionAmount
          }, { transaction: t });
        }
      }
    }

    await t.commit();
    await safetyPillowService.recalculateAndSave(userId, familyId);
    
    return await Transaction.findByPk(transaction.id, {
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: Category, as: 'Category', attributes: ['id', 'name', 'type'] },
      ],
    });
  } catch (error) {
    await t.rollback();
    throw error;
  }
};


// Обновить операцию
exports.updateTransaction = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { amount, type, category_id, date, comment, is_private } = req.body;

    const transaction = await Transaction.findOne({
      where: { id, family_id: user.family_id },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Операция не найдена' });
    }

    if (transaction.user_id !== user.id && user.family?.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на редактирование' });
    }

    if (amount !== undefined) transaction.amount = amount;
    if (type !== undefined) transaction.type = type;
    if (category_id !== undefined) transaction.category_id = category_id;
    if (date !== undefined) transaction.date = date;
    if (comment !== undefined) transaction.comment = comment;
    if (is_private !== undefined) transaction.is_private = is_private;

    await transaction.save();

    // Пересчёт подушки безопасности
    await safetyPillowController.recalculateAndSave(user.id, user.family_id);

    const updated = await Transaction.findByPk(transaction.id, {
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: Category, as: 'Category', attributes: ['id', 'name', 'type'] },
      ],
    });

    res.json(prepareTransactionForUser(updated, user.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Удалить операцию
exports.deleteTransaction = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      where: { id, family_id: user.family_id },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Операция не найдена' });
    }

    if (transaction.user_id !== user.id && user.family?.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на удаление' });
    }

    await transaction.destroy();

    // Пересчёт подушки безопасности
    await safetyPillowController.recalculateAndSave(user.id, user.family_id);

    res.json({ message: 'Операция удалена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};