const { Op } = require('sequelize');
const { Transaction, Category, User, Family, Goal, GoalContribution } = require('../models');

// Вспомогательная функция для определения видимости операции
const prepareTransactionForUser = (transaction, currentUserId) => {
  const isOwner = transaction.user_id === currentUserId;
  if (!isOwner && transaction.is_private) {
    // Если операция скрыта и не принадлежит текущему пользователю
    return {
      id: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date,
      is_private: true,
      is_hidden: true, // флаг, что детали скрыты
      user_id: transaction.user_id,
      user_name: transaction.User?.name,
      category_name: 'Скрытая операция',
      comment: 'Сюрприз',
    };
  }
  // Полная информация
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

// Получить все операции семьи (с фильтрацией)
exports.getTransactions = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const {
      startDate,
      endDate,
      type,
      categoryId,
      userId,
      includePrivate = 'all', // 'all', 'only_visible', 'only_private'
    } = req.query;

    const where = { family_id: familyId };

    // Фильтр по дате
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    if (type && (type === 'income' || type === 'expense')) {
      where.type = type;
    }

    if (categoryId) {
      where.category_id = categoryId;
    }

    if (userId) {
      where.user_id = userId;
    }

    // Фильтр по приватности
    if (includePrivate === 'only_visible') {
      where.is_private = false;
    } else if (includePrivate === 'only_private') {
      where.is_private = true;
    }

    const transactions = await Transaction.findAll({
      where,
      include: [
        { model: User, attributes: ['id', 'name'] },
        { model: Category, attributes: ['id', 'name', 'type'] },
      ],
      order: [['date', 'DESC'], ['created_at', 'DESC']],
    });

    // Преобразуем каждую операцию в зависимости от прав
    const result = transactions.map(t => prepareTransactionForUser(t, user.id));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получить одну операцию по ID
exports.getTransactionById = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      where: { id, family_id: user.family_id },
      include: [
        { model: User, attributes: ['id', 'name'] },
        { model: Category, attributes: ['id', 'name', 'type'] },
      ],
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Операция не найдена' });
    }

    const result = prepareTransactionForUser(transaction, user.id);
    // Если операция скрыта и не принадлежит текущему пользователю, возвращаем только ограниченные данные
    if (result.is_hidden) {
      return res.json(result);
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Добавить операцию
exports.createTransaction = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const { amount, type, category_id, date, comment, is_private } = req.body;

    // Валидация
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Сумма должна быть положительным числом' });
    }
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Укажите тип: income или expense' });
    }
    if (!category_id) {
      return res.status(400).json({ message: 'Выберите категорию' });
    }

    // Проверим, что категория существует и принадлежит семье или является системной
    const category = await Category.findOne({
      where: {
        id: category_id,
        [Op.or]: [
          { family_id: familyId },
          { family_id: null, user_id: null }, // системная категория
          { user_id: user.id },
        ],
      },
    });
    if (!category) {
      return res.status(400).json({ message: 'Категория не найдена или недоступна' });
    }

    // Создаём операцию
    const transaction = await Transaction.create({
      user_id: user.id,
      family_id: familyId,
      amount,
      type,
      category_id,
      date: date || new Date(),
      comment: comment || null,
      is_private: is_private || false,
    });

    // TODO: здесь будет обработка автозачисления на цели (если доход и включено автозачисление)
    // Пока просто возвращаем созданную операцию

    // Загрузим связанные данные для ответа
    const created = await Transaction.findByPk(transaction.id, {
      include: [
        { model: User, attributes: ['id', 'name'] },
        { model: Category, attributes: ['id', 'name', 'type'] },
      ],
    });

if (type === 'income') {
  // Ищем все цели пользователя и семейные цели, у которых включено автозачисление
  const userGoals = await Goal.findAll({
    where: {
      [Op.or]: [
        { user_id: user.id, family_id: null },
        { family_id: familyId }
      ],
      auto_contribute_enabled: true
    }
  });

  for (const goal of userGoals) {
    let contributionAmount = 0;
    if (goal.auto_contribute_type === 'percentage') {
      contributionAmount = (amount * goal.auto_contribute_value) / 100;
    } else if (goal.auto_contribute_type === 'fixed') {
      contributionAmount = goal.auto_contribute_value;
    }

    if (contributionAmount > 0) {
      // Создаём запись в goal_contributions
      await GoalContribution.create({
        goal_id: goal.id,
        amount: contributionAmount,
        date: date || new Date(),
        transaction_id: transaction.id
      });
      // Обновляем current_amount цели
      await goal.update({
        current_amount: parseFloat(goal.current_amount) + contributionAmount
      });
    }
  }
}

    res.status(201).json(prepareTransactionForUser(created, user.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
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

    // Проверим права: только автор или владелец семьи может редактировать
    if (transaction.user_id !== user.id && user.family?.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на редактирование' });
    }

    // Обновляем поля
    if (amount !== undefined) transaction.amount = amount;
    if (type !== undefined) transaction.type = type;
    if (category_id !== undefined) transaction.category_id = category_id;
    if (date !== undefined) transaction.date = date;
    if (comment !== undefined) transaction.comment = comment;
    if (is_private !== undefined) transaction.is_private = is_private;

    await transaction.save();

    const updated = await Transaction.findByPk(transaction.id, {
      include: [
        { model: User, attributes: ['id', 'name'] },
        { model: Category, attributes: ['id', 'name', 'type'] },
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

    // Права: только автор или владелец семьи
    if (transaction.user_id !== user.id && user.family?.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на удаление' });
    }

    await transaction.destroy();
    res.json({ message: 'Операция удалена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};