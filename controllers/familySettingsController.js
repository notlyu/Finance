const prisma = require('../lib/prisma-client');
const { logger } = require('../lib/errors');

exports.getFamilySettings = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user.family_id) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }
    
    let settings = await prisma.familySettings.findUnique({
      where: { family_id: user.family_id }
    });
    
    if (!settings) {
      settings = await prisma.familySettings.create({
        data: { family_id: user.family_id }
      });
    }
    
    logger.info(`User ${user.id} fetched family settings`);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

exports.updateFamilySettings = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user.family_id) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }
    
    const { show_personal_in_stats, safety_pillow_months } = req.body;
    
    const data = { updated_at: new Date() };
    if (show_personal_in_stats !== undefined) data.show_personal_in_stats = show_personal_in_stats;
    if (safety_pillow_months !== undefined) data.safety_pillow_months = safety_pillow_months;
    
    const settings = await prisma.familySettings.upsert({
      where: { family_id: user.family_id },
      update: data,
      create: {
        family_id: user.family_id,
        show_personal_in_stats: show_personal_in_stats || false,
        safety_pillow_months: safety_pillow_months || 3
      }
    });
    
    logger.info(`User ${user.id} updated family settings`);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};
