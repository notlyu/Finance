const { SafetyPillowSetting, SafetyPillowHistory } = require('../models');
const pillowService = require('../services/safetyPillowService');

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

// Обновить настройки подушки (1-24 месяца)
exports.updateSettings = async (req, res) => {
  try {
    const user = req.user;
    const { months } = req.body;
    if (!months || months < 1 || months > 24) {
      return res.status(400).json({ message: 'Количество месяцев должно быть от 1 до 24' });
    }

    const [settings, created] = await SafetyPillowSetting.upsert({
      user_id: user.id,
      months: parseInt(months)
    });
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получить текущую подушку с уровнями и рекомендациями
exports.getSafetyPillow = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const result = await pillowService.calculateSafetyPillow(user.id, familyId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Пересчитать и сохранить историю (вызывается после каждой операции)
exports.recalculateAndSave = async (userId, familyId) => {
  try {
    const result = await pillowService.calculateSafetyPillow(userId, familyId);
    await SafetyPillowHistory.create({
      user_id: userId,
      value: result.liquidFunds,
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
