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
    const { months } = req.validated;

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

    const pillowResult = await pillowService.calculateSafetyPillow(user.id, user.family_id);
    const avgMonthlyExpense = pillowResult.monthlyAverage || 0;
    const incomeAmount = pillowResult.liquidFunds + avgMonthlyExpense * 3;
    const expenseAmount = avgMonthlyExpense * 3;
    const calculatedPillow = pillowResult.liquidFunds;

    await prisma.safetyPillowSnapshot.create({
      data: {
        user_id: user.id,
        family_id: user.family_id,
        total_income: incomeAmount,
        total_expenses: expenseAmount,
        safety_pillow: calculatedPillow,
        monthly_limit: settings.months * avgMonthlyExpense,
      }
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
    const limit = Math.min(parseInt(req.query.limit) || 30, 200);
    const offset = parseInt(req.query.offset) || 0;
    const where = user.family_id 
      ? { family_id: user.family_id }
      : { user_id: user.id };
    const [items, total] = await Promise.all([
      prisma.safetyPillowSnapshot.findMany({
        where,
        orderBy: { calculated_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.safetyPillowSnapshot.count({ where }),
    ]);
    logger.info(`User ${user.id} got ${items.length} pillow snapshot records`);
    res.json({ items, total, limit, offset });
  } catch (error) {
    next(error);
  }
};

exports.createSnapshot = async (req, res, next) => {
  try {
    const user = req.user;
    const result = await pillowService.calculateSafetyPillow(user.id, user.family_id);
    
    const snapshot = await prisma.safetyPillowSnapshot.create({
      data: {
        user_id: user.family_id ? null : user.id,
        family_id: user.family_id || null,
        total_income: 0,
        total_expenses: 0,
        safety_pillow: result.liquidFunds,
        monthly_limit: result.target,
        calculated_at: new Date(),
      }
    });
    
    logger.info(`User ${user.id} manually created pillow snapshot`);
    res.status(201).json({ message: 'Snapshot created', snapshot });
  } catch (error) {
    next(error);
  }
};