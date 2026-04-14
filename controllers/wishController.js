const prisma = require('../lib/prisma-client');
const { logger, ValidationError, NotFoundError, AppError, ForbiddenError } = require('../lib/errors');

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

exports.fundWish = async (req, res, next) => {
  try {
    const user = req.user;
    const wishId = Number(req.params.id);
    if (!Number.isInteger(wishId) || wishId <= 0) {
      throw new ValidationError('Неверный ID желания');
    }

    const familyId = user.family_id;

    const wish = await prisma.wish.findFirst({
      where: familyId
        ? { id: wishId, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id: wishId, family_id: null, user_id: user.id },
    });
    if (!wish) {
      throw new NotFoundError('Желание не найдено');
    }

    let amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      throw new ValidationError('Укажите корректную сумму для пополнения');
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

    logger.info(`User ${user.id} funded wish ${wish.id}, amount: ${amount}`);
    res.status(201).json({
      message: 'Желание пополнено',
      saved_amount: newSaved,
      transaction_id: tx.id,
      availableFunds: available
    });
  } catch (error) {
    next(error);
  }
};

exports.getWishes = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const where = familyId
      ? {
          OR: [
            { family_id: null, user_id: user.id },
            { family_id: familyId, is_private: false }
          ]
        }
      : { family_id: null, user_id: user.id };

    if (String(req.query.showArchived || '') !== 'true') {
      where.archived = false;
    }

    const wishes = await prisma.wish.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        family: { select: { id: true, name: true } }
      },
      orderBy: [{ priority: 'asc' }, { created_at: 'desc' }]
    });

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

    logger.info(`User ${user.id} fetched ${wishes.length} wishes`);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getWishById = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const familyId = user.family_id;

    const wish = await prisma.wish.findFirst({
      where: familyId
        ? { id: Number(id), OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id: Number(id), family_id: null, user_id: user.id },
      include: {
        user: { select: { id: true, name: true } },
        wishContributions: { orderBy: { date: 'desc' } }
      }
    });

    if (!wish) {
      throw new NotFoundError('Желание не найдено');
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

    const w = { ...wish };
    w.progress = (() => {
      try {
        return Math.min(100, Math.max(0, (parseFloat(w.saved_amount) || 0) / (parseFloat(w.cost) || 1) * 100));
      } catch { return null; }
    })();
    logger.info(`User ${user.id} fetched wish ${id}`);
    res.json(w);
  } catch (error) {
    next(error);
  }
};

exports.createWish = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const { name, cost, priority, status, saved_amount, is_private, category_id } = req.body;

    if (!name || !cost) {
      throw new ValidationError('Название и стоимость обязательны');
    }
    let catId = category_id;
    if (!catId) {
      const catFamilyId = familyId || null;
      let defaultCat = await prisma.category.findFirst({
        where: { name: 'Без категории', family_id: catFamilyId }
      });
      if (!defaultCat) {
        defaultCat = await prisma.category.create({
          data: { name: 'Без категории', family_id: catFamilyId, type: 'expense' }
        });
      }
      catId = defaultCat.id;
    }

    const wish = await prisma.wish.create({
      data: {
        user_id: user.id,
        family_id: familyId || null,
        name,
        cost,
        priority: priority || 3,
        status: status || 'active',
        saved_amount: saved_amount || 0,
        is_private: is_private !== undefined ? is_private : true,
        category_id: catId
      }
    });

    const w = { ...wish };
    w.progress = (() => {
      try { return Math.min(100, Math.max(0, (parseFloat(w.saved_amount) || 0) / (parseFloat(w.cost) || 1) * 100)); } catch { return null; }
    })();
    logger.info(`User ${user.id} created wish ${wish.id}`);
    res.status(201).json(w);
  } catch (error) {
    next(error);
  }
};

exports.updateWish = async (req, res, next) => {
  try {
    const user = req.user;
    const wishId = Number(req.params.id);
    if (!Number.isInteger(wishId) || wishId <= 0) {
      throw new ValidationError('Неверный ID');
    }
    const updateData = req.body;

    const familyId = user.family_id;

    const wish = await prisma.wish.findFirst({
      where: familyId
        ? { id: wishId, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id: wishId, family_id: null, user_id: user.id }
    });

    if (!wish) {
      throw new NotFoundError('Желание не найдено');
    }

    if (wish.user_id !== user.id && user.family_id && user.family_id !== familyId) {
      throw new ForbiddenError('Нет прав на редактирование');
    }

    const { created_at, archived_at, ...safeData } = updateData;
    const updated = await prisma.wish.update({
      where: { id: wishId },
      data: safeData
    });
    logger.info(`User ${user.id} updated wish ${wishId}`);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteWish = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const familyId = user.family_id;

    const wish = await prisma.wish.findFirst({
      where: familyId
        ? { id: Number(id), OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id: Number(id), family_id: null, user_id: user.id }
    });

    if (!wish) {
      throw new NotFoundError('Желание не найдено');
    }

    if (wish.user_id !== user.id && user.Family?.owner_user_id !== user.id) {
      throw new ForbiddenError('Нет прав на удаление');
    }

    await prisma.wish.delete({ where: { id: Number(id) } });
    logger.info(`User ${user.id} deleted wish ${id}`);
    res.json({ message: 'Желание удалено' });
  } catch (error) {
    next(error);
  }
};

exports.contributeToWish = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { amount, date, createTransaction, category_id, comment, is_private, skipWarning } = req.body;

    if (!amount || amount <= 0) {
      throw new ValidationError('Сумма должна быть положительным числом');
    }

    const familyId = user.family_id;

    const wish = await prisma.wish.findFirst({
      where: familyId
        ? { id: Number(id), OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id: Number(id), family_id: null, user_id: user.id }
    });

    if (!wish) {
      throw new NotFoundError('Желание не найдено');
    }

    if (wish.user_id !== user.id) {
      throw new ForbiddenError('Нет прав на пополнение этого желания');
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
          throw new ValidationError('category_id обязателен для createTransaction');
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

    logger.info(`User ${user.id} contributed to wish ${id}, amount: ${amount}`);
    res.status(201).json({
      message: 'Желание пополнено',
      contribution: result.contribution,
      saved_amount: result.newSavedAmount,
      transaction_id: result.transactionId,
      warning: skipWarning ? warning : null,
    });
  } catch (error) {
    next(error);
  }
};

exports.exportWishes = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const where = familyId
      ? { OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
      : { family_id: null, user_id: user.id };
    const wishes = await prisma.wish.findMany({
      where,
      include: { user: { select: { id: true, name: true } } }
    });
    const header = ['id', 'name', 'cost', 'saved_amount', 'priority', 'status', 'is_private', 'user', 'family'];
    const rows = wishes.map(w => [
      w.id, w.name, w.cost, w.saved_amount, w.priority, w.status, w.is_private,
      w.user?.name || '', w.family_id ? 'семейное' : 'личное'
    ]);
    const csv = [header.join(','), ...rows.map(r => r.map(v => String(v ?? '')).join(','))].join('\n');
    logger.info(`User ${user.id} exported ${wishes.length} wishes`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="wishes.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};