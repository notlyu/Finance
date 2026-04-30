const prisma = require('../lib/prisma-client');
const { logger } = require('../lib/errors');

exports.getWidgetConfig = async (req, res, next) => {
  try {
    const user = req.user;
    let config = await prisma.userWidgetConfig.findUnique({
      where: { user_id: user.id }
    });
    
    if (!config) {
      // Создаём конфиг по умолчанию
      config = await prisma.userWidgetConfig.create({
        data: {
          user_id: user.id,
          personal_widgets: { widgets: ['balance', 'income-expense', 'goals', 'recent-transactions'] },
          family_widgets: { widgets: ['family-balance', 'family-income-expense', 'family-goals'] }
        }
      });
    }
    
    logger.info(`User ${user.id} fetched widget config`);
    res.json(config);
  } catch (error) {
    next(error);
  }
};

exports.updateWidgetConfig = async (req, res, next) => {
  try {
    const user = req.user;
    const { personal_widgets, family_widgets } = req.body;
    
    const data = { updated_at: new Date() };
    if (personal_widgets !== undefined) data.personal_widgets = personal_widgets;
    if (family_widgets !== undefined) data.family_widgets = family_widgets;
    
    const config = await prisma.userWidgetConfig.upsert({
      where: { user_id: user.id },
      update: data,
      create: {
        user_id: user.id,
        personal_widgets: personal_widgets || { widgets: ['balance', 'income-expense', 'goals', 'recent-transactions'] },
        family_widgets: family_widgets || { widgets: ['family-balance', 'family-income-expense', 'family-goals'] }
      }
    });
    
    logger.info(`User ${user.id} updated widget config`);
    res.json(config);
  } catch (error) {
    next(error);
  }
};
