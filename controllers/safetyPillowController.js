const { Transaction, Goal, Wish, SafetyPillowSetting, SafetyPillowHistory } = require('../models');
const { Op } = require('sequelize');

// Получить настройки подушки пользователя
exports.getSettings = async (req, res) => {
  try {
    const user = req.user;
    let settings = await SafetyPillowSetting.findOne({
      where: { user_id: user.id }
    });
    if (!settings) {
      settings = await SafetyPillowSetting.create({
        user_id: user.id,
        months: 3
      });
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Обновить настройки подушки
exports.updateSettings = async (req, res) => {
  try {
    const user = req.user;
    const { months } = req.body;
    if (!months || months < 1 || months > 12) {
      return res.status(400).json({ message: 'Количество месяцев должно быть от 1 до 12' });
    }

    const [settings, created] = await SafetyPillowSetting.upsert({
      user_id: user.id,
      months
    });
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Рассчитать текущую подушку безопасности
async function calculateSafetyPillow(userId, familyId) {
  // 1. Среднемесячные расходы за последние 3 месяца
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const expenses = await Transaction.findAll({
    where: {
      family_id: familyId,
      type: 'expense',
      date: { [Op.gte]: threeMonthsAgo }
    },
    attributes: ['amount']
  });
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const monthlyAverage = totalExpenses / 3;

  // 2. Свободные средства: сумма всех доходов минус расходы
  const allTransactions = await Transaction.findAll({
    where: { family_id: familyId },
    attributes: ['type', 'amount']
  });
  let freeFunds = 0;
  for (const t of allTransactions) {
    if (t.type === 'income') freeFunds += parseFloat(t.amount);
    else freeFunds -= parseFloat(t.amount);
  }

  // 3. Накопления на целях и желаниях
  const goals = await Goal.findAll({
    where: { family_id: familyId },
    attributes: ['current_amount']
  });
  const wishes = await Wish.findAll({
    where: { family_id: familyId },
    attributes: ['saved_amount']
  });
  const totalGoals = goals.reduce((sum, g) => sum + parseFloat(g.current_amount), 0);
  const totalWishes = wishes.reduce((sum, w) => sum + parseFloat(w.saved_amount), 0);

  const totalFunds = freeFunds + totalGoals + totalWishes;

  // 4. Настройки пользователя
  const settings = await SafetyPillowSetting.findOne({ where: { user_id: userId } });
  const months = settings ? settings.months : 3;
  const target = monthlyAverage * months;

  return {
    current: totalFunds,
    target,
    monthlyAverage,
    progress: target > 0 ? (totalFunds / target) * 100 : 0
  };
}

// Получить текущую подушку
exports.getSafetyPillow = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const result = await calculateSafetyPillow(user.id, familyId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Пересчитать и сохранить историю (вызывается после каждой операции)
exports.recalculateAndSave = async (userId, familyId) => {
  try {
    const result = await calculateSafetyPillow(userId, familyId);
    await SafetyPillowHistory.create({
      user_id: userId,
      value: result.current,
      target_value: result.target,
      calculated_at: new Date()
    });
    return result;
  } catch (error) {
    console.error('Ошибка сохранения истории подушки:', error);
  }
};

// Получить историю подушки (для графиков)
exports.getHistory = async (req, res) => {
  try {
    const user = req.user;
    const { limit = 30 } = req.query;
    const history = await SafetyPillowHistory.findAll({
      where: { user_id: user.id },
      order: [['calculated_at', 'DESC']],
      limit: parseInt(limit)
    });
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};