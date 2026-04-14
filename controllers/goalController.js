const prisma = require('../lib/prisma-client');
const { logger, ValidationError, NotFoundError, AppError, ForbiddenError } = require('../lib/errors');

const calculateMonthlyContribution = (targetAmount, currentAmount, monthsRemaining, interestRate = 0) => {
  if (monthsRemaining <= 0) return 0;
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  if (interestRate > 0) {
    const monthlyRate = interestRate / 100 / 12;
    const numerator = remaining * monthlyRate;
    const denominator = Math.pow(1 + monthlyRate, monthsRemaining) - 1;
    return numerator / denominator;
  }
  return remaining / monthsRemaining;
};

exports.getGoals = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const archiveFilter = req.query.archived;
    let where;
    if (familyId) {
      where = archiveFilter === 'true'
        ? { is_archived: true, OR: [{ family_id: familyId }, { user_id: user.id, family_id: null }] }
        : archiveFilter === 'false'
        ? { is_archived: false, OR: [{ family_id: familyId }, { user_id: user.id, family_id: null }] }
        : { OR: [{ family_id: familyId }, { user_id: user.id, family_id: null }] };
    } else {
      where = archiveFilter === 'true'
        ? { is_archived: true, user_id: user.id, family_id: null }
        : archiveFilter === 'false'
        ? { is_archived: false, user_id: user.id, family_id: null }
        : { user_id: user.id, family_id: null };
    }

    const goals = await prisma.goal.findMany({
      where,
      include: { user: { select: { id: true, name: true } }, family: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' }
    });

    const mapped = goals.map(g => {
      let auto_contribute_percent = null;
      if (g.auto_contribute_type === 'percentage' && g.auto_contribute_value !== null) {
        auto_contribute_percent = parseFloat(g.auto_contribute_value);
      }
      const achieved = !!g.is_archived || (Number(g.current_amount || 0) >= Number(g.target_amount || 0));
      const progress = (Number(g.target_amount || 0) > 0) ? Math.min(100, Math.max(0, (Number(g.current_amount || 0) / Number(g.target_amount || 0)) * 100)) : 0;
      return { ...g, auto_contribute_percent, achieved, progress };
    });
    logger.info(`User ${user.id} fetched ${goals.length} goals`);
    res.json(mapped);
  } catch (error) {
    next(error);
  }
};

exports.getGoalById = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const goal = await prisma.goal.findFirst({
      where: {
        id: Number(id),
        OR: [
          { family_id: user.family_id },
          { user_id: user.id, family_id: null }
        ]
      },
      include: { 
        user: { select: { id: true, name: true } }, 
        family: { select: { id: true, name: true } },
        contributions: { orderBy: { created_at: 'desc' } }
      }
    });

    if (!goal) {
      throw new NotFoundError('Цель не найдена');
    }

    let forecast = null;
    if (req.query.months && req.query.monthlyAmount) {
      const months = parseInt(req.query.months);
      const monthlyAmount = parseFloat(req.query.monthlyAmount);
      const interestRate = Number(goal.interest_rate) || 0;
      let futureAmount = Number(goal.current_amount);
      const monthlyRate = interestRate / 100 / 12;
      for (let i = 0; i < months; i++) {
        futureAmount += monthlyAmount;
        futureAmount += futureAmount * monthlyRate;
      }
      forecast = {
        months,
        monthlyAmount,
        futureAmount: Math.round(futureAmount * 100) / 100,
        targetAchieved: futureAmount >= Number(goal.target_amount)
      };
    } else if (goal.deadline) {
      const today = new Date();
      const targetDate = new Date(goal.deadline);
      const monthsRemaining = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
      const neededMonthly = calculateMonthlyContribution(
        Number(goal.target_amount),
        Number(goal.current_amount),
        monthsRemaining,
        Number(goal.interest_rate) || 0
      );
      forecast = {
        monthsRemaining: Math.max(0, monthsRemaining),
        neededMonthly: Math.round(neededMonthly * 100) / 100
      };
    }

    const achieved = !!goal.is_archived || (Number(goal.current_amount) >= Number(goal.target_amount));

    logger.info(`User ${user.id} fetched goal ${id}`);
    res.json({ ...goal, forecast, achieved });
  } catch (error) {
    next(error);
  }
};

exports.createGoal = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const {
      name,
      target_amount,
      target_date,
      interest_rate,
      current_amount,
      auto_contribute_enabled,
      auto_contribute_type,
      auto_contribute_value,
      is_family_goal
    } = req.body;

    if (!name || !target_amount) {
      throw new ValidationError('Название и целевая сумма обязательны');
    }

    const goalData = {
      name,
      target_amount,
      deadline: target_date ? new Date(target_date) : null,
      current_amount: current_amount || 0,
      auto_contribute_enabled: auto_contribute_enabled || false,
      auto_contribute_type: auto_contribute_type || null,
      auto_contribute_value: auto_contribute_value || null
    };

    if ((Number(target_amount) || 0) > 0 && (Number(current_amount) || 0) >= Number(target_amount)) {
      goalData.is_archived = true;
      goalData.archived_at = new Date();
      goalData.status = 'completed';
    }

    if (is_family_goal && familyId) {
      goalData.family_id = familyId;
      goalData.user_id = user.id;
    } else {
      goalData.user_id = user.id;
      goalData.family_id = null;
    }

    const goal = await prisma.goal.create({ data: goalData });
    logger.info(`User ${user.id} created goal ${goal.id}`);
    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
};

exports.updateGoal = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const goal = await prisma.goal.findFirst({
      where: {
        id: Number(id),
        OR: [
          { family_id: user.family_id },
          { user_id: user.id, family_id: null }
        ]
      },
      include: { family: true }
    });

    if (!goal) {
      throw new NotFoundError('Цель не найдена');
    }

    if (goal.user_id !== user.id && goal.family?.owner_user_id !== user.id) {
      throw new ForbiddenError('Нет прав на редактирование');
    }

    const updated = await prisma.goal.update({
      where: { id: Number(id) },
      data: updateData
    });
    logger.info(`User ${user.id} updated goal ${id}`);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteGoal = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const goal = await prisma.goal.findFirst({
      where: {
        id: Number(id),
        OR: [
          { family_id: user.family_id },
          { user_id: user.id, family_id: null }
        ]
      },
      include: { family: true }
    });

    if (!goal) {
      throw new NotFoundError('Цель не найдена');
    }

    if (goal.user_id !== user.id && goal.family?.owner_user_id !== user.id) {
      throw new ForbiddenError('Нет прав на удаление');
    }

    await prisma.goal.delete({ where: { id: Number(id) } });
    logger.info(`User ${user.id} deleted goal ${id}`);
    res.json({ message: 'Цель удалена' });
  } catch (error) {
    next(error);
  }
};

async function checkContributionWarning(userId, familyId, amount) {
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
    const available = balance - reserved;
    const afterContribution = available - Number(amount);
    const threshold = balance * 0.1;
    return afterContribution < threshold ? { warning: true, available, afterContribution, threshold } : null;
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
  const available = balance - reserved;
  const afterContribution = available - Number(amount);
  const threshold = balance * 0.1;
  return afterContribution < threshold ? { warning: true, available, afterContribution, threshold } : null;
}

exports.contributeToGoal = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { amount, date, createTransaction, category_id, comment, is_private, skipWarning } = req.body;

    if (!amount || amount <= 0) {
      throw new ValidationError('Сумма должна быть положительным числом');
    }

    const goal = await prisma.goal.findFirst({
      where: {
        id: Number(id),
        OR: [
          { family_id: user.family_id },
          { user_id: user.id, family_id: null }
        ]
      }
    });

    if (!goal) {
      throw new NotFoundError('Цель не найдена');
    }

    const fundsForGoal = goal.family_id ? user.family_id : null;
    const warning = await checkContributionWarning(user.id, fundsForGoal, amount);
    if (warning && !skipWarning) {
      return res.status(200).json({ warning });
    }

    const result = await prisma.$transaction(async (tx) => {
      let transactionId = null;
      if (createTransaction) {
        let catId = category_id;
        if (!catId) {
          let cat = await tx.category.findFirst({ where: { name: 'Пополнение целей', family_id: goal.family_id } });
          if (!cat) {
            cat = await tx.category.create({ data: { name: 'Пополнение целей', family_id: goal.family_id, type: 'expense' } });
          }
          catId = cat.id;
        }
        const newTx = await tx.transaction.create({
          data: {
            user_id: user.id,
            family_id: goal.family_id,
            amount,
            type: 'expense',
            category_id: catId,
            date: date ? new Date(date) : new Date(),
            comment: comment || `Пополнение цели: ${goal.name}`,
            is_private: !!is_private,
          }
        });
        transactionId = newTx.id;
      }

      const contribution = await tx.goalContribution.create({
        data: {
          goal_id: goal.id,
          user_id: user.id,
          amount,
          transaction_id: transactionId,
        }
      });

      const newCurrentAmount = parseFloat(goal.current_amount) + parseFloat(amount);
      await tx.goal.update({
        where: { id: goal.id },
        data: { current_amount: newCurrentAmount }
      });
      const reached = newCurrentAmount >= parseFloat(goal.target_amount);
      if (reached) {
        await tx.goal.update({
          where: { id: goal.id },
          data: { is_archived: true, archived_at: new Date() }
        });
      }

      return { contribution, newCurrentAmount, transactionId, reached };
    });

    if (result.reached) {
      const { notifyGoalReached } = require('../services/notificationService');
      const updatedGoal = await prisma.goal.findUnique({ where: { id: goal.id } });
      notifyGoalReached(updatedGoal).catch(err => next(err));
    }

    logger.info(`User ${user.id} contributed to goal ${id}, amount: ${amount}`);
    res.status(201).json({
      message: 'Цель пополнена',
      contribution: result.contribution,
      current_amount: result.newCurrentAmount,
      transaction_id: result.transactionId,
      warning: skipWarning ? warning : null,
    });
  } catch (error) {
    if (String(error.message || '').includes('category_id обязателен')) {
      throw new ValidationError(error.message);
    }
    next(error);
  }
};

exports.getForecast = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { months, monthlyAmount } = req.query;

    if (!months || !monthlyAmount) {
      throw new ValidationError('Необходимо указать months и monthlyAmount');
    }

    const goal = await prisma.goal.findFirst({
      where: {
        id: Number(id),
        OR: [
          { family_id: user.family_id },
          { user_id: user.id, family_id: null }
        ]
      }
    });

    if (!goal) {
      throw new NotFoundError('Цель не найдена');
    }

    const monthsNum = parseInt(months);
    const monthly = parseFloat(monthlyAmount);
    const interestRate = Number(goal.interest_rate) || 0;
    let futureAmount = Number(goal.current_amount);
    const monthlyRate = interestRate / 100 / 12;
    for (let i = 0; i < monthsNum; i++) {
      futureAmount += monthly;
      futureAmount += futureAmount * monthlyRate;
    }

    logger.info(`User ${user.id} got forecast for goal ${id}`);
    res.json({
      months: monthsNum,
      monthlyAmount: monthly,
      futureAmount: Math.round(futureAmount * 100) / 100,
      targetAchieved: futureAmount >= Number(goal.target_amount)
    });
  } catch (error) {
    next(error);
  }
};

exports.exportGoals = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const goals = await prisma.goal.findMany({
      where: {
        OR: [
          { family_id: familyId },
          { user_id: user.id, family_id: null }
        ]
      },
      include: { contributions: true }
    });

    const header = ['id','name','target_amount','current_amount','interest_rate','auto_contribute_enabled','auto_contribute_type','auto_contribute_value'];
    const rows = goals.map(g => [g.id, g.name, g.target_amount, g.current_amount, g.interest_rate, g.auto_contribute_enabled, g.auto_contribute_type, g.auto_contribute_value]);
    const csv = [header.join(','), ...rows.map(r => r.map(v => String(v ?? '')).join(','))].join('\n');

    logger.info(`User ${user.id} exported ${goals.length} goals`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="goals.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};