const prisma = require('../lib/prisma-client');
const { logger, ValidationError, NotFoundError, ForbiddenError } = require('../lib/errors');

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

exports.getRecurring = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const q = req.validatedQuery || req.query;
    const limit = Math.min(Number(q.limit) || 50, 200);
    const offset = Number(q.offset) || 0;

    const where = familyId
      ? { OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
      : { user_id: user.id, family_id: null };

    const [items, total] = await Promise.all([
      prisma.recurringTransaction.findMany({
        where,
        orderBy: [{ active: 'desc' }, { type: 'asc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.recurringTransaction.count({ where }),
    ]);

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
    res.json({
      items: items.map(i => ({
        id: i.id,
        type: i.type,
        amount: i.amount,
        category_id: i.category_id,
        account_id: i.account_id,
        category_name: categoryMap[i.category_id] || '',
        day_of_month: i.day_of_month,
        start_month: i.start_month,
        comment: i.comment,
        scope: i.scope || (i.family_id ? 'family' : 'personal'),
        active: !!i.active,
        last_run_month: i.last_run_month,
        debt_id: i.debt_id,
      })),
      total,
      limit,
      offset,
    });
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
      scope: reqScope,
    } = req.validated;
    const { account_id } = req.body;
    const scope = reqScope || 'personal';

    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) throw new ValidationError('amount должен быть > 0');
    const day = Number(day_of_month);
    if (!Number.isFinite(day) || day < 1 || day > 31) throw new ValidationError('day_of_month должен быть 1..31');
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const validDay = Math.min(day, lastDay);
    if (!/^\d{4}-\d{2}$/.test(String(start_month))) throw new ValidationError('start_month должен быть YYYY-MM');
    if (!category_id) throw new ValidationError('category_id обязателен');

    let accId = null;
    if (account_id) {
      const acc = await prisma.account.findFirst({
        where: familyId
          ? { id: Number(account_id), OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
          : { id: Number(account_id), family_id: null, user_id: user.id }
      });
      if (!acc) throw new NotFoundError('Счёт не найден');
      accId = acc.id;
    }

    const item = await prisma.recurringTransaction.create({
      data: {
        family_id: scope !== 'personal' && familyId ? familyId : null,
        user_id: user.id,
        account_id: accId,
        category_id,
        amount: a,
        type,
        day_of_month: validDay,
        start_month,
        comment: comment || null,
        scope,
      }
    });

    logger.info(`User ${user.id} created recurring transaction ${item.id}`);
    res.status(201).json({ ...item, scope: item.scope || (item.family_id ? 'family' : 'personal') });
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
      if (req.validated.amount != null) {
        const a = Number(req.validated.amount);
        if (!Number.isFinite(a) || a <= 0) throw new ValidationError('amount должен быть > 0');
        patch.amount = a;
      }
      if (req.validated.day_of_month != null) {
        const day = Number(req.validated.day_of_month);
        if (!Number.isFinite(day) || day < 1 || day > 31) throw new ValidationError('day_of_month должен быть 1..31');
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        patch.day_of_month = Math.min(day, lastDay);
      }
      if (req.validated.category_id != null) patch.category_id = req.validated.category_id;
      if (req.validated.comment != null) patch.comment = req.validated.comment || null;
      if (req.validated.scope != null) patch.scope = req.validated.scope;
      if (req.validated.active != null) patch.active = !!req.validated.active;
      if (req.body.account_id !== undefined) {
        if (req.body.account_id === null || req.body.account_id === '') {
          patch.account_id = null;
        } else {
          const acc = await prisma.account.findFirst({
            where: familyId
              ? { id: Number(req.body.account_id), OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
              : { id: Number(req.body.account_id), family_id: null, user_id: user.id }
          });
          if (!acc) throw new NotFoundError('Счёт не найден');
          patch.account_id = acc.id;
        }
      }
      if (req.validated.type != null) patch.type = req.validated.type;
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
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};