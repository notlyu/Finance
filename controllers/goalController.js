const { Goal, GoalContribution, Transaction, User, Family, Category, Wish } = require('../lib/models');
const { Op } = require('../lib/models');

// Вспомогательная функция для расчёта необходимого ежемесячного взноса
const calculateMonthlyContribution = (targetAmount, currentAmount, monthsRemaining, interestRate = 0) => {
  if (monthsRemaining <= 0) return 0;
  // Упрощённая формула без сложных процентов (можно усложнить позже)
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  if (interestRate > 0) {
    // Простая формула с ежемесячной капитализацией (для наглядности)
    const monthlyRate = interestRate / 100 / 12;
    const numerator = remaining * monthlyRate;
    const denominator = Math.pow(1 + monthlyRate, monthsRemaining) - 1;
    return numerator / denominator;
  }
  return remaining / monthsRemaining;
};

// Получить все цели (личные + семейные)
exports.getGoals = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const archiveFilter = req.query.archived;
    const where = familyId
      ? { OR: [{ family_id: familyId }, { user_id: user.id, family_id: null }] }
      : { user_id: user.id, family_id: null };
    if (archiveFilter === 'true') {
      where.is_archived = true;
    } else if (archiveFilter === 'false') {
      where.is_archived = false;
    }

    const goals = await Goal.findAll({
      where,
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: Family, as: 'Family', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

     const mapped = goals.map(g => {
       // Compute auto_contribute_percent for frontend compatibility
       let auto_contribute_percent = null;
       if (g.auto_contribute_type === 'percentage' && g.auto_contribute_value !== null) {
         auto_contribute_percent = parseFloat(g.auto_contribute_value);
       }
       
      const achieved = !!g.is_archived || (Number(g.current_amount || 0) >= Number(g.target_amount || 0));
       const progress = (Number(g.target_amount || 0) > 0) ? Math.min(100, Math.max(0, (Number(g.current_amount || 0) / Number(g.target_amount || 0)) * 100)) : 0;
       
       return {
         ...g,
         auto_contribute_percent,
         achieved,
         progress
       };
     });
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получить одну цель
exports.getGoalById = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const goal = await Goal.findOne({
      where: {
        id,
        OR: [
          { family_id: user.family_id },
          { user_id: user.id, family_id: null }
        ]
      },
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: Family, as: 'Family', attributes: ['id', 'name'] },
        { model: GoalContribution, as: 'Contributions', order: [['date', 'DESC']] }
      ]
    });

    if (!goal) {
      return res.status(404).json({ message: 'Цель не найдена' });
    }

    // Рассчитываем прогноз, если передан query параметр
    let forecast = null;
    if (req.query.months && req.query.monthlyAmount) {
      const months = parseInt(req.query.months);
      const monthlyAmount = parseFloat(req.query.monthlyAmount);
      const interestRate = goal.interest_rate || 0;
      let futureAmount = goal.current_amount;
      const monthlyRate = interestRate / 100 / 12;
      for (let i = 0; i < months; i++) {
        futureAmount += monthlyAmount;
        futureAmount += futureAmount * monthlyRate;
      }
      forecast = {
        months,
        monthlyAmount,
        futureAmount: Math.round(futureAmount * 100) / 100,
        targetAchieved: futureAmount >= goal.target_amount
      };
    } else if (goal.target_date) {
      const today = new Date();
      const targetDate = new Date(goal.target_date);
      const monthsRemaining = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
      const neededMonthly = calculateMonthlyContribution(
        goal.target_amount,
        goal.current_amount,
        monthsRemaining,
        goal.interest_rate || 0
      );
      forecast = {
        monthsRemaining: Math.max(0, monthsRemaining),
        neededMonthly: Math.round(neededMonthly * 100) / 100
      };
    }

    res.json({
      ...goal.toJSON(),
      forecast,
       achieved: !!goal.is_archived || (Number(goal.current_amount || 0) >= Number(goal.target_amount || 0))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Создать цель
exports.createGoal = async (req, res) => {
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
      is_family_goal // флаг, что цель общая для семьи
    } = req.body;

    if (!name || !target_amount) {
      return res.status(400).json({ message: 'Название и целевая сумма обязательны' });
    }

    // Проверка: если цель семейная, то family_id = familyId, иначе user_id = user.id, family_id = null
  const goalData = {
      name,
      target_amount,
      target_date: target_date || null,
      interest_rate: interest_rate || null,
      current_amount: current_amount || 0,
      auto_contribute_enabled: auto_contribute_enabled || false,
      auto_contribute_type: auto_contribute_type || null,
      auto_contribute_value: auto_contribute_value || null
    };

    // If initial amount already meets target, archive immediately
    if ((Number(target_amount) || 0) > 0 && (Number(current_amount) || 0) >= Number(target_amount)) {
        goalData.is_archived = true;
       goalData.archived_at = new Date();
      goalData.status = 'completed';
    }

    if (is_family_goal && familyId) {
      goalData.family_id = familyId;
      goalData.user_id = user.id; // создатель цели
    } else {
      goalData.user_id = user.id;
      goalData.family_id = null;
    }

    const goal = await Goal.create(goalData);
    res.status(201).json(goal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Обновить цель
exports.updateGoal = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const goal = await Goal.findOne({
      where: {
        id,
        OR: [
          { family_id: user.family_id },
          { user_id: user.id, family_id: null }
        ]
      }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Цель не найдена' });
    }

    // Проверка прав: только создатель цели или владелец семьи
    if (goal.user_id !== user.id && user.Family?.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на редактирование' });
    }

    await goal.update(updateData);
    res.json(goal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Удалить цель
exports.deleteGoal = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const goal = await Goal.findOne({
       where: {
         id,
         OR: [
           { family_id: user.family_id },
           { user_id: user.id, family_id: null }
         ]
       }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Цель не найдена' });
    }

    if (goal.user_id !== user.id && user.Family?.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на удаление' });
    }

    await goal.destroy();
    res.json({ message: 'Цель удалена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Проверка предупреждения перед расходом
async function checkContributionWarning(userId, familyId, amount) {
  if (!familyId) {
    const income = await Transaction.sum('amount', { where: { user_id: userId, family_id: null, type: 'income' } }) || 0;
    const expense = await Transaction.sum('amount', { where: { user_id: userId, family_id: null, type: 'expense' } }) || 0;
    const balance = Number(income) - Number(expense);
    const reserved = ((await Goal.sum('current_amount', { where: { user_id: userId, family_id: null } }) || 0) + (await Wish.sum('saved_amount', { where: { user_id: userId } }) || 0));
    const available = balance - reserved;
    const afterContribution = available - Number(amount);
    const threshold = balance * 0.1;
    return afterContribution < threshold ? { warning: true, available, afterContribution, threshold } : null;
  }

  const income = await Transaction.sum('amount', { where: { family_id: familyId, type: 'income' } }) || 0;
  const expense = await Transaction.sum('amount', { where: { family_id: familyId, type: 'expense' } }) || 0;
  const balance = Number(income) - Number(expense);
  const reserved = ((await Goal.sum('current_amount', { where: { family_id: familyId } }) || 0) + (await Wish.sum('saved_amount', { where: { family_id: familyId } }) || 0));
  const available = balance - reserved;
  const afterContribution = available - Number(amount);
  const threshold = balance * 0.1;
  return afterContribution < threshold ? { warning: true, available, afterContribution, threshold } : null;
}

// Ручное пополнение цели
exports.contributeToGoal = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { amount, date, createTransaction, category_id, comment, is_private, skipWarning } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Сумма должна быть положительным числом' });
    }

    const goal = await Goal.findOne({
      where: {
        id,
        OR: [
          { family_id: user.family_id },
          { user_id: user.id, family_id: null }
        ]
      }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Цель не найдена' });
    }

    const fundsForGoal = goal.family_id ? user.family_id : null;
    const warning = await checkContributionWarning(user.id, fundsForGoal, amount);
    if (warning && !skipWarning) {
      return res.status(200).json({ warning });
    }

    const result = await Goal.sequelize.transaction(async (t) => {
      let transactionId = null;
      if (createTransaction) {
        let catId = category_id;
        if (!catId) {
          const [cat] = await Category.findOrCreate({
            where: { name: 'Пополнение целей', family_id: goal.family_id },
            defaults: { name: 'Пополнение целей', family_id: goal.family_id, type: 'expense' },
            transaction: t
          });
          catId = cat.id;
        }
        const tx = await Transaction.create({
          user_id: user.id,
          family_id: goal.family_id,
          amount,
          type: 'expense',
          category_id: catId,
          date: date || new Date(),
          comment: comment || `Пополнение цели: ${goal.name}`,
          is_private: !!is_private,
        }, { transaction: t });
        transactionId = tx.id;
      }

      const contribution = await GoalContribution.create({
        goal_id: goal.id,
        amount,
        date: date || new Date(),
        type: 'contribution',
        transaction_id: transactionId,
        automatic: false
      }, { transaction: t });

      const newCurrentAmount = parseFloat(goal.current_amount) + parseFloat(amount);
      await goal.update({ current_amount: newCurrentAmount }, { transaction: t });
      // Archive if reached target
      const reached = newCurrentAmount >= parseFloat(goal.target_amount);
      if (reached) {
          await goal.update({ is_archived: true, archived_at: new Date(), status: 'completed' }, { transaction: t });
      }

      return { contribution, newCurrentAmount, transactionId, reached };
    });

    // Send notification if goal reached
    if (result.reached) {
      const { notifyGoalReached } = require('../services/notificationService');
      const updatedGoal = await Goal.findByPk(goal.id);
      notifyGoalReached(updatedGoal).catch(console.error);
    }

    res.status(201).json({
      message: 'Цель пополнена',
      contribution: result.contribution,
      current_amount: result.newCurrentAmount,
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

// Прогноз для цели без сохранения
exports.getForecast = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { months, monthlyAmount } = req.query;

    if (!months || !monthlyAmount) {
      return res.status(400).json({ message: 'Необходимо указать months и monthlyAmount' });
    }

    const goal = await Goal.findOne({
      where: {
        id,
        OR: [
          { family_id: user.family_id },
          { user_id: user.id, family_id: null }
        ]
      }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Цель не найдена' });
    }

    const monthsNum = parseInt(months);
    const monthly = parseFloat(monthlyAmount);
    const interestRate = goal.interest_rate || 0;
    let futureAmount = goal.current_amount;
    const monthlyRate = interestRate / 100 / 12;
    for (let i = 0; i < monthsNum; i++) {
      futureAmount += monthly;
      futureAmount += futureAmount * monthlyRate;
    }

    res.json({
      months: monthsNum,
      monthlyAmount: monthly,
      futureAmount: Math.round(futureAmount * 100) / 100,
      targetAchieved: futureAmount >= goal.target_amount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Экспорт целей (CSV)
exports.exportGoals = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
const where = {
      OR: [
        { family_id: familyId },
        { user_id: user.id, family_id: null }
      ]
    };
    const goals = await Goal.findAll({ where, include: [{ model: GoalContribution, as: 'Contributions' }] });

    const header = ['id','name','target_amount','current_amount','interest_rate','auto_contribute_enabled','auto_contribute_type','auto_contribute_value'];
    const rows = goals.map(g => [g.id, g.name, g.target_amount, g.current_amount, g.interest_rate, g.auto_contribute_enabled, g.auto_contribute_type, g.auto_contribute_value]);
    const csv = [header.join(','), ...rows.map(r => r.map(v => String(v ?? '')).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="goals.csv"');
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
