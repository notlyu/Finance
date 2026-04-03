const { Wish, WishContribution, User, Family, Transaction, Category, Goal } = require('../models');
const { Op } = require('sequelize');

// Пополнение желания из свободных средств семьи
exports.fundWish = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const wish = await Wish.findOne({ where: { id, family_id: familyId } });
    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    // Рассчитать доступные средства
    const incomeSum = await Transaction.sum('amount', { where: { family_id: familyId, type: 'income' } }) || 0;
    const expenseSum = await Transaction.sum('amount', { where: { family_id: familyId, type: 'expense' } }) || 0;
    const balance = Number(incomeSum) - Number(expenseSum);
    const currentGoals = await Goal.sum('current_amount', { where: { family_id: familyId } }) || 0;
    const currentWishes = await Wish.sum('saved_amount', { where: { family_id: familyId } }) || 0;
    const reservedTotal = Number(currentGoals || 0) + Number(currentWishes || 0);
    const available = balance - reservedTotal;

    let amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      return res.status(400).json({ message: 'Укажите корректную сумму для пополнения' });
    }

    // Найти или создать категорию (обязательно указываем type: 'expense')
    const [category] = await Category.findOrCreate({
      where: { name: 'Выделение средств на желания', family_id: familyId },
      defaults: { name: 'Выделение средств на желания', family_id: familyId, type: 'expense' }
    });

    // Дата как строка YYYY-MM-DD для DATEONLY
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Создать транзакцию расхода
    const tx = await Transaction.create({
      user_id: user.id,
      family_id: familyId,
      amount,
      type: 'expense',
      category_id: category.id,
      date: dateStr,
      comment: `Пополнение желания: ${wish.name}`,
      is_private: false,
    });

    // Создать запись пополнения желания
    await WishContribution.create({
      wish_id: wish.id,
      amount,
      date: dateStr,
      transaction_id: tx.id
    });

    // Обновить сумму желания
    const newSaved = parseFloat(wish.saved_amount) + amount;
    await wish.update({ saved_amount: newSaved });

    // Автоархивация при выполнении
    if (newSaved >= parseFloat(wish.cost)) {
      await wish.update({ status: 'completed', archived: true, archived_at: new Date() });
    }

    res.status(201).json({
      message: 'Желание пополнено',
      saved_amount: newSaved,
      transaction_id: tx.id,
      availableFunds: available
    });
  } catch (error) {
    console.error('fundWish error:', error);
    res.status(500).json({ message: error.message || 'Ошибка сервера' });
  }
};

// Получить все желания пользователя (личные + семейные)
exports.getWishes = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const where = {
      family_id: familyId,
      [Op.or]: [
        { user_id: user.id },                // личные желания пользователя
        { is_private: false }                // не скрытые желания других членов
      ]
    };
    // By default hide archived wishes as part of active overview
    if (String(req.query.showArchived || '') !== 'true') {
      where.archived = false;
    }

    const wishes = await Wish.findAll({
      where,
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] }
      ],
      order: [['priority', 'ASC'], ['created_at', 'DESC']]
    });

    // Скрываем приватные желания других пользователей и добавляем прогресс
    const result = wishes.map(wish => {
      const isOwner = wish.user_id === user.id;
      if (!isOwner && wish.is_private) {
        return {
          id: wish.id,
          is_private: true,
          is_hidden: true,
          user_name: wish.User?.name,
          priority: wish.priority,
          status: wish.status,
          cost: wish.cost,
          saved_amount: wish.saved_amount,
          name: 'Скрытое желание'
        };
      }
      const w = wish.toJSON();
      w.progress = (() => {
        try {
          const c = parseFloat(w.saved_amount) || 0;
          const t = parseFloat(w.cost) || 1;
          return Math.min(100, Math.max(0, (c / t) * 100));
        } catch {
          return null;
        }
      })();
      return w;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

    // Получить одно желание
exports.getWishById = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const wish = await Wish.findOne({
      where: {
        id,
        family_id: user.family_id
      },
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: WishContribution, as: 'Contributions', order: [['date', 'DESC']] }
      ]
    });

    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    const isOwner = wish.user_id === user.id;
    if (!isOwner && wish.is_private) {
      return res.json({
        id: wish.id,
        is_private: true,
        is_hidden: true,
        user_name: wish.User.name,
        priority: wish.priority,
        status: wish.status,
        cost: wish.cost,
        saved_amount: wish.saved_amount,
        progress: null,
        name: 'Скрытое желание'
      });
    }

    const w = wish.toJSON();
    w.progress = (() => {
      try {
        return Math.min(100, Math.max(0, (parseFloat(w.saved_amount) || 0) / (parseFloat(w.cost) || 1) * 100));
      } catch { return null; }
    })();
    res.json(w);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Создать желание
exports.createWish = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const { name, cost, priority, status, saved_amount, is_private, category_id } = req.body;
    // If category_id provided use it, otherwise fallback to "Без категории"

    if (!name || !cost) {
      return res.status(400).json({ message: 'Название и стоимость обязательны' });
    }
    // determine category id
    let catId = category_id;
    if (!catId) {
      const [defaultCat] = await Category.findOrCreate({
        where: { name: 'Без категории', family_id: familyId },
        defaults: { name: 'Без категории', family_id: familyId }
      });
      catId = defaultCat.id;
    }

    const wish = await Wish.create({
      user_id: user.id,
      family_id: familyId,
      name,
      cost,
      priority: priority || 3,
      status: status || 'active',
      saved_amount: saved_amount || 0,
      is_private: is_private || false
      , category_id: catId
    });

    const w = wish.toJSON();
    w.progress = (() => {
      try { return Math.min(100, Math.max(0, (parseFloat(w.saved_amount) || 0) / (parseFloat(w.cost) || 1) * 100)); } catch { return null; }
    })();
    res.status(201).json(w);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Обновить желание
exports.updateWish = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const wish = await Wish.findOne({
      where: {
        id,
        family_id: user.family_id
      }
    });

    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    if (wish.user_id !== user.id && user.family?.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на редактирование' });
    }

    await wish.update(updateData);
    res.json(wish);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Удалить желание
exports.deleteWish = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const wish = await Wish.findOne({
      where: {
        id,
        family_id: user.family_id
      }
    });

    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    if (wish.user_id !== user.id && user.family?.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на удаление' });
    }

    await wish.destroy();
    res.json({ message: 'Желание удалено' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Пополнить желание
exports.contributeToWish = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { amount, date, createTransaction, category_id, comment, is_private } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Сумма должна быть положительным числом' });
    }

    const wish = await Wish.findOne({
      where: {
        id,
        family_id: user.family_id
      }
    });

    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    // Проверка прав: пополнять может только владелец желания
    if (wish.user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на пополнение этого желания' });
    }

    const result = await Wish.sequelize.transaction(async (t) => {
      let transactionId = null;
      if (createTransaction) {
        if (!category_id) {
          throw new Error('category_id обязателен для createTransaction');
        }
        const tx = await Transaction.create({
          user_id: user.id,
          family_id: user.family_id,
          amount,
          type: 'expense',
          category_id,
          date: date || new Date(),
          comment: comment || `Пополнение желания: ${wish.name}`,
          is_private: !!is_private,
        }, { transaction: t });
        transactionId = tx.id;
      }

      const contribution = await WishContribution.create({
        wish_id: wish.id,
        amount,
        date: date || new Date(),
        transaction_id: transactionId,
      }, { transaction: t });

      const newSavedAmount = parseFloat(wish.saved_amount) + parseFloat(amount);
      await wish.update({ saved_amount: newSavedAmount }, { transaction: t });
      // Archive wish if completed via manual contribution
      if (newSavedAmount >= parseFloat(wish.cost)) {
        await wish.update({ archived: true, archived_at: new Date(), status: 'completed' }, { transaction: t });
      }

      return { contribution, newSavedAmount, transactionId };
    });

    res.status(201).json({
      message: 'Желание пополнено',
      contribution: result.contribution,
      saved_amount: result.newSavedAmount,
      transaction_id: result.transactionId
    });
  } catch (error) {
    console.error(error);
    if (String(error.message || '').includes('category_id обязателен')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
// Экспорт желаний (CSV)
exports.exportWishes = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const where = { family_id: familyId };
    const wishes = await Wish.findAll({ where, include: [{ model: User, as: 'User', attributes: ['name'] }] });
    const header = ['id','name','cost','saved_amount','priority','status','is_private','user'];
    const rows = wishes.map(w => [w.id, w.name, w.cost, w.saved_amount, w.priority, w.status, w.is_private, w.User?.name || '']);
    const csv = [header.join(','), ...rows.map(r => r.map(v => String(v ?? '')).join(','))].join('\n');
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="wishes.csv"');
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
