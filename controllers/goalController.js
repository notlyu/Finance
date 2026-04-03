const { Goal, GoalContribution, Transaction, User, Family } = require('../models');
const { Op } = require('sequelize');

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
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    // Archive filtering support: default to non-archived goals
    const archiveFilter = req.query.archived;
    const where = {
      [Op.or]: [
        { family_id: familyId },
        { user_id: user.id, family_id: null } // личные цели пользователя
      ]
    };
    if (archiveFilter === 'true') {
      where.archived = true;
    } else if (archiveFilter === 'false') {
      where.archived = false;
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
      const obj = g.toJSON();
      obj.achieved = !!obj.archived || (Number(obj.current_amount || 0) >= Number(obj.target_amount || 0));
      obj.progress = (Number(obj.target_amount || 0) > 0) ? Math.min(100, Math.max(0, (Number(obj.current_amount || 0) / Number(obj.target_amount || 0)) * 100)) : 0;
      return obj;
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
        [Op.or]: [
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
      achieved: !!goal.archived || (Number(goal.current_amount || 0) >= Number(goal.target_amount || 0))
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
      goalData.archived = true;
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
        [Op.or]: [
          { family_id: user.family_id },
          { user_id: user.id, family_id: null }
        ]
      }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Цель не найдена' });
    }

    // Проверка прав: только создатель цели или владелец семьи
    if (goal.user_id !== user.id && user.family?.owner_user_id !== user.id) {
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
        [Op.or]: [
          { family_id: user.family_id },
          { user_id: user.id, family_id: null }
        ]
      }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Цель не найдена' });
    }

    if (goal.user_id !== user.id && user.family?.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на удаление' });
    }

    await goal.destroy();
    res.json({ message: 'Цель удалена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Ручное пополнение цели
exports.contributeToGoal = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { amount, date, createTransaction, category_id, comment, is_private } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Сумма должна быть положительным числом' });
    }

    const goal = await Goal.findOne({
      where: {
        id,
        [Op.or]: [
          { family_id: user.family_id },
          { user_id: user.id, family_id: null }
        ]
      }
    });

    if (!goal) {
      return res.status(404).json({ message: 'Цель не найдена' });
    }

    const result = await Goal.sequelize.transaction(async (t) => {
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
        await goal.update({ archived: true, archived_at: new Date(), status: 'completed' }, { transaction: t });
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
        [Op.or]: [
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
      [Op.or]: [
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
