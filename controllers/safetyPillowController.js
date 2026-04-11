const { SafetyPillowSetting, SafetyPillowHistory, prisma } = require('../lib/models');
const pillowService = require('../services/safetyPillowService');

// Получить настройки подушки пользователя
exports.getSettings = async (req, res) => {
  try {
    const user = req.user;
    let settings = await prisma.safetyPillowSetting.findFirst({
      where: { user_id: user.id }
    });
    if (!settings) {
      settings = await prisma.safetyPillowSetting.create({
        data: { user_id: user.id, months: 3 }
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

    const existing = await prisma.safetyPillowSetting.findFirst({
      where: { user_id: user.id }
    });
    const settings = existing
      ? await prisma.safetyPillowSetting.update({
          where: { id: existing.id },
          data: { months: parseInt(months) }
        })
      : await prisma.safetyPillowSetting.create({
          data: { user_id: user.id, months: parseInt(months) }
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
    await prisma.safetyPillowHistory.create({
      data: {
        user_id: userId,
        value: result.liquidFunds,
        target_value: result.target,
        calculated_at: new Date()
      }
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
    const limit = parseInt(req.query.limit) || 30;
    const history = await prisma.safetyPillowHistory.findMany({
      where: { user_id: user.id },
      orderBy: { calculated_at: 'desc' },
      take: limit
    });
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
