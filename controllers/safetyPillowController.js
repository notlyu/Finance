const prisma = require('../lib/prisma-client');
const pillowService = require('../services/safetyPillowService');
const { logger, ValidationError } = require('../lib/errors');

exports.getSettings = async (req, res, next) => {
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
    logger.info(`User ${user.id} got safety pillow settings`);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const user = req.user;
    const { months } = req.body;
    if (!months || months < 1 || months > 24) {
      throw new ValidationError('Количество месяцев должно быть от 1 до 24');
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
    logger.info(`User ${user.id} updated safety pillow settings to ${months} months`);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

exports.getSafetyPillow = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const result = await pillowService.calculateSafetyPillow(user.id, familyId);
    logger.info(`User ${user.id} got safety pillow data`);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.recalculateAndSave = async (userId, familyId) => {
  try {
    const result = await pillowService.calculateSafetyPillow(userId, familyId);
    await prisma.safetyPillowHistory.create({
      data: {
        user_id: userId,
        total_income: 0,
        total_expenses: 0,
        safety_pillow: result.liquidFunds,
        calculated_at: new Date()
      }
    });
    return result;
  } catch (error) {
    logger.info(`Error saving pillow history for user ${userId}: ${error.message}`);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const user = req.user;
    const limit = parseInt(req.query.limit) || 30;
    const history = await prisma.safetyPillowHistory.findMany({
      where: { user_id: user.id },
      orderBy: { calculated_at: 'desc' },
      take: limit
    });
    logger.info(`User ${user.id} got ${history.length} pillow history records`);
    res.json(history);
  } catch (error) {
    next(error);
  }
};