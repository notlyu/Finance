const { Wish, WishContribution, User, Family, Transaction, Category, Goal, prisma } = require('../lib/models');
const { Op } = require('../lib/models');

async function calcAvailableFunds(userId, familyId) {
  if (!familyId) {
    const incomeAgg = await prisma.transaction.aggregate({
      where: { user_id: userId, family_id: null, type: 'income' },
      _sum: { amount: true }
    });
    const expenseAgg = await prisma.transaction.aggregate({
      where: { user_id: userId, family_id: null, type: 'expense' },
      _sum: { amount: true }
    });
    const income = incomeAgg._sum?.amount || 0;
    const expense = expenseAgg._sum?.amount || 0;
    const balance = Number(income) - Number(expense);
    
    const goalsAgg = await prisma.goal.aggregate({
      where: { user_id: userId, family_id: null },
      _sum: { current_amount: true }
    });
    const wishesAgg = await prisma.wish.aggregate({
      where: { user_id: userId },
      _sum: { saved_amount: true }
    });
    const reserved = (goalsAgg._sum?.current_amount || 0) + (wishesAgg._sum?.saved_amount || 0);
    return { balance, reserved, available: balance - reserved };
  }
  const incomeAgg = await prisma.transaction.aggregate({
    where: { family_id: familyId, type: 'income' },
    _sum: { amount: true }
  });
  const expenseAgg = await prisma.transaction.aggregate({
    where: { family_id: familyId, type: 'expense' },
    _sum: { amount: true }
  });
  const income = incomeAgg._sum?.amount || 0;
  const expense = expenseAgg._sum?.amount || 0;
  const balance = Number(income) - Number(expense);
  
  const goalsAgg = await prisma.goal.aggregate({
    where: { family_id: familyId },
    _sum: { current_amount: true }
  });
  const wishesAgg = await prisma.wish.aggregate({
    where: { family_id: familyId },
    _sum: { saved_amount: true }
  });
  const reserved = (goalsAgg._sum?.current_amount || 0) + (wishesAgg._sum?.saved_amount || 0);
  return { balance, reserved, available: balance - reserved };
}

exports.fundWish = async (req, res) => {
  try {
    const user = req.user;
    const wishId = Number(req.params.id);
    if (!Number.isInteger(wishId) || wishId <= 0) {
      return res.status(400).json({ message: 'Неверный ID желания' });
    }

    const familyId = user.family_id;

    const wish = await prisma.wish.findFirst({
      where: familyId
        ? { id: wishId, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id: wishId, family_id: null, user_id: user.id },
    });
    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    let amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      return res.status(400).json({ message: 'Укажите корректную сумму для пополнения' });
    }

    const fundsForWish = wish.family_id ? familyId : null;
    const { balance, available } = await calcAvailableFunds(user.id, fundsForWish);
    const afterContribution = available - amount;
    const threshold = balance * 0.1;
    const warning = afterContribution < threshold && !req.body.skipWarning
      ? { warning: true, available, afterContribution, threshold }
      : null;
    if (warning) {
      return res.status(200).json(warning);
    }

    const category = await prisma.category.findFirst({ where: { name: 'Выделение средств на желания', family_id: wish.family_id } });
    let categoryId = category?.id;
    if (!categoryId) {
      const newCat = await prisma.category.create({
        data: { name: 'Выделение средств на желания', family_id: wish.family_id, type: 'expense', is_system: false }
      });
      categoryId = newCat.id;
    }

    const now = new Date();

    const tx = await prisma.transaction.create({
      data: {
        user_id: user.id,
        family_id: wish.family_id,
        amount,
        type: 'expense',
        category_id: categoryId,
        date: now,
        comment: `Пополнение желания: ${wish.name}`,
is_private: false,
      }
    });

    await prisma.wishContribution.create({
      data: {
        wish_id: wish.id,
        user_id: user.id,
        amount,
        transaction_id: tx.id
      }
    });

    const newSaved = parseFloat(wish.saved_amount || 0) + amount;
    await prisma.wish.update({
      where: { id: wish.id },
      data: { saved_amount: newSaved }
    });

    if (newSaved >= parseFloat(wish.cost)) {
      await prisma.wish.update({
        where: { id: wish.id },
        data: { status: 'completed', archived: true, archived_at: now }
      });
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

    // Показываем: личные желания пользователя (family_id=null) И семейные желания (family_id=familyId)
    const where = familyId
      ? {
          OR: [
            { family_id: null, user_id: user.id },      // личные желания
            { family_id: familyId, is_private: false }  // семейные (не приватные)
          ]
        }
      : { family_id: null, user_id: user.id };         // solo — только личные

     if (String(req.query.showArchived || '') !== 'true') {
        where.archived = false;
     }

    const wishes = await Wish.findAll({
      where,
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: Family, as: 'Family', attributes: ['id', 'name'] }
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
const w = { ...wish };
      w.progress = (() => {
        try {
          const c = parseFloat(w.saved_amount) || 0;
          const t = parseFloat(w.cost) || 1;
          return Math.min(100, Math.max(0, (c / t) * 100));
        } catch {
          return null;
        }
      })();
      w.family_id = wish.family_id;
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

    const familyId = user.family_id;

    const wish = await Wish.findOne({
      where: familyId
        ? { id, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id, family_id: null, user_id: user.id },
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
        user_name: wish.User?.name,
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

    const { name, cost, priority, status, saved_amount, is_private, category_id } = req.body;

    if (!name || !cost) {
      return res.status(400).json({ message: 'Название и стоимость обязательны' });
    }
    let catId = category_id;
    if (!catId) {
      const catFamilyId = familyId || null;
      const [defaultCat] = await Category.findOrCreate({
        where: { name: 'Без категории', family_id: catFamilyId },
        defaults: { name: 'Без категории', family_id: catFamilyId }
      });
      catId = defaultCat.id;
    }

    const wish = await Wish.create({
      user_id: user.id,
      family_id: familyId || null,
      name,
      cost,
      priority: priority || 3,
      status: status || 'active',
      saved_amount: saved_amount || 0,
      is_private: is_private !== undefined ? is_private : true,
      category_id: catId
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
    const wishId = Number(req.params.id);
    if (!Number.isInteger(wishId) || wishId <= 0) {
      return res.status(400).json({ message: 'Неверный ID' });
    }
    const updateData = req.body;

    const familyId = user.family_id;

    const wish = await prisma.wish.findFirst({
      where: familyId
        ? { id: wishId, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id: wishId, family_id: null, user_id: user.id }
    });

    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    if (wish.user_id !== user.id && user.family_id && user.family_id !== familyId) {
      return res.status(403).json({ message: 'Нет прав на редактирование' });
    }

    const { created_at, archived_at, ...safeData } = updateData;
    const updated = await prisma.wish.update({
      where: { id: wishId },
      data: safeData
    });
    res.json(updated);
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

    const familyId = user.family_id;

    const wish = await Wish.findOne({
      where: familyId
        ? { id, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id, family_id: null, user_id: user.id }
    });

    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    if (wish.user_id !== user.id && user.Family?.owner_user_id !== user.id) {
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
    const { amount, date, createTransaction, category_id, comment, is_private, skipWarning } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Сумма должна быть положительным числом' });
    }

    const familyId = user.family_id;

    const wish = await Wish.findOne({
      where: familyId
        ? { id, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id, family_id: null, user_id: user.id }
    });

    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    if (wish.user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на пополнение этого желания' });
    }

    const fundsForWish = wish.family_id ? familyId : null;
    const { balance, available } = await calcAvailableFunds(user.id, fundsForWish);
    const afterContribution = available - amount;
    const threshold = balance * 0.1;
    const warning = afterContribution < threshold && !skipWarning
      ? { warning: true, available, afterContribution, threshold }
      : null;
    if (warning) {
      return res.status(200).json(warning);
    }

const result = await prisma.$transaction(async (tx) => {
      let transactionId = null;
      if (createTransaction) {
        if (!category_id) {
          throw new Error('category_id обязателен для createTransaction');
        }
        const newTx = await tx.transaction.create({
          data: {
            user_id: user.id,
            family_id: wish.family_id,
            amount,
            type: 'expense',
            category_id,
            date: date || new Date(),
            comment: comment || `Пополнение желания: ${wish.name}`,
            is_private: !!is_private,
          }
        });
        transactionId = newTx.id;
      }

      const contribution = await tx.wishContribution.create({
        data: {
          wish_id: wish.id,
          amount,
          date: date || new Date(),
          transaction_id: transactionId,
        }
      });

      const newSavedAmount = parseFloat(wish.saved_amount) + parseFloat(amount);
      await tx.wish.update({
        where: { id: wish.id },
        data: { saved_amount: newSavedAmount }
      });
      if (newSavedAmount >= parseFloat(wish.cost)) {
        await tx.wish.update({
          where: { id: wish.id },
          data: { archived: true, archived_at: new Date(), status: 'completed' }
        });
      }

      return { contribution, newSavedAmount, transactionId };
    });

    res.status(201).json({
      message: 'Желание пополнено',
      contribution: result.contribution,
      saved_amount: result.newSavedAmount,
      transaction_id: result.transactionId,
      warning: skipWarning ? warning : null,
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
    const where = familyId
      ? { OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
      : { family_id: null, user_id: user.id };
    const wishes = await Wish.findAll({ where, include: [{ model: User, as: 'User', attributes: ['name'] }] });
    const header = ['id', 'name', 'cost', 'saved_amount', 'priority', 'status', 'is_private', 'user', 'family'];
    const rows = wishes.map(w => [
      w.id, w.name, w.cost, w.saved_amount, w.priority, w.status, w.is_private,
      w.User?.name || '', w.family_id ? 'семейное' : 'личное'
    ]);
    const csv = [header.join(','), ...rows.map(r => r.map(v => String(v ?? '')).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="wishes.csv"');
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
