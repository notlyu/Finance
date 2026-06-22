const prisma = require('../lib/prisma-client');
const { logger, ValidationError, ForbiddenError } = require('../lib/errors');

exports.getFamilySettings = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user.family_id) {
      // Пользователь без семьи — отдаём дефолты, а не ошибку
      return res.json({ show_personal_in_stats: false, safety_pillow_months: 3, family_id: null });
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
      throw new ValidationError('Вы не состоите в семье');
    }
    
    const { show_personal_in_stats, safety_pillow_months } = req.validated;

    // Режим прозрачности (снятие маски с личного для всей семьи) меняет только владелец.
    // Проверяем владельца лишь при фактическом ИЗМЕНЕНИИ значения — иначе участник,
    // редактирующий другие поля (frontend всегда шлёт show_personal_in_stats), ложно получал бы 403.
    if (show_personal_in_stats !== undefined) {
      const [family, current] = await Promise.all([
        prisma.family.findUnique({ where: { id: user.family_id }, select: { owner_user_id: true } }),
        prisma.familySettings.findUnique({ where: { family_id: user.family_id }, select: { show_personal_in_stats: true } }),
      ]);
      const currentVal = current?.show_personal_in_stats ?? false;
      if (show_personal_in_stats !== currentVal && (!family || family.owner_user_id !== user.id)) {
        throw new ForbiddenError('Режим прозрачности может менять только владелец семьи');
      }
    }

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
