const prisma = require('../lib/prisma-client');
const { logger, ValidationError, NotFoundError, ForbiddenError } = require('../lib/errors');

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

exports.getRecurring = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const where = familyId
      ? { OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
      : { user_id: user.id, family_id: null };

    const items = await prisma.recurringTransaction.findMany({
      where,
      orderBy: [{ active: 'desc' }, { type: 'asc' }, { id: 'desc' }],
    });

    const categoryIds = [...new Set(items.map(i => i.category_id))];
    let categoryMap = {};
    if (categoryIds.length > 0) {
      try {
        const categories = await prisma.category.findMany({
          where: { id: { in: categoryIds } },
        });
        categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
      } catch (catErr) {
        logger.info(`Category fetch warning: ${catErr.message}`);
      }
    }

    logger.info(`User ${user.id} fetched ${items.length} recurring transactions`);
    res.json(items.map(i => ({
      id: i.id,
      type: i.type,
      amount: i.amount,
      category_id: i.category_id,
      category_name: categoryMap[i.category_id] || '',
      day_of_month: i.day_of_month,
      start_month: i.start_month,
      comment: i.comment,
      is_private: !!i.is_private,
      active: !!i.active,
      last_run_month: i.last_run_month,
    })));
  } catch (error) {
    next(error);
  }
};

exports.createRecurring = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const {
      type,
      amount,
      category_id,
      day_of_month = 1,
      start_month = currentMonth(),
      comment,
      is_private = false,
    } = req.body;

    if (!['income', 'expense'].includes(type)) throw new ValidationError('Некорректный type');
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) throw new ValidationError('amount должен быть > 0');
    const day = Number(day_of_month);
    if (!Number.isFinite(day) || day < 1 || day > 28) throw new ValidationError('day_of_month должен быть 1..28');
    if (!/^\d{4}-\d{2}$/.test(String(start_month))) throw new ValidationError('start_month должен быть YYYY-MM');
    if (!category_id) throw new ValidationError('category_id обязателен');

    const item = await prisma.recurringTransaction.create({
      data: {
        family_id: familyId || null,
        user_id: user.id,
        category_id,
        amount: a,
        type,
        day_of_month: day,
        start_month,
        comment: comment || null,
        is_private: !!is_private,
      }
    });

    logger.info(`User ${user.id} created recurring transaction ${item.id}`);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

exports.updateRecurring = async (req, res, next) => {
   try {
     const user = req.user;
     const familyId = user.family_id;

     const { id } = req.params;
     const item = await prisma.recurringTransaction.findFirst({
       where: familyId
         ? { id: Number(id), OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
         : { id: Number(id), user_id: user.id, family_id: null },
     });
     if (!item) throw new NotFoundError('Не найдено');

     if (item.user_id !== user.id) throw new ForbiddenError('Нет прав');

     const patch = {};
     if (req.body.amount != null) {
       const a = Number(req.body.amount);
       if (!Number.isFinite(a) || a <= 0) throw new ValidationError('amount должен быть > 0');
       patch.amount = a;
     }
     if (req.body.day_of_month != null) {
       const day = Number(req.body.day_of_month);
       if (!Number.isFinite(day) || day < 1 || day > 28) throw new ValidationError('day_of_month должен быть 1..28');
       patch.day_of_month = day;
     }
     if (req.body.category_id != null) patch.category_id = req.body.category_id;
     if (req.body.comment != null) patch.comment = req.body.comment || null;
     if (req.body.is_private != null) patch.is_private = !!req.body.is_private;
     if (req.body.active != null) patch.active = !!req.body.active;
     patch.updated_at = new Date();

     const updated = await prisma.recurringTransaction.update({
       where: { id: item.id },
       data: patch,
     });
     logger.info(`User ${user.id} updated recurring transaction ${id}`);
     res.json(updated);
   } catch (error) {
     next(error);
   }
 };

exports.deleteRecurring = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const { id } = req.params;
    const item = await prisma.recurringTransaction.findFirst({
      where: familyId
        ? { id: Number(id), OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { id: Number(id), user_id: user.id, family_id: null },
    });
    if (!item) throw new NotFoundError('Не найдено');
    if (item.user_id !== user.id) throw new ForbiddenError('Нет прав');

    await prisma.recurringTransaction.delete({ where: { id: item.id } });
    logger.info(`User ${user.id} deleted recurring transaction ${id}`);
    res.json({ message: 'Удалено' });
  } catch (error) {
    next(error);
  }
};