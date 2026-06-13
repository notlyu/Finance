const prisma = require('../lib/prisma-client');
const { ValidationError, NotFoundError } = require('../lib/errors');

const getDebts = async (userId, familyId, limit = 50, offset = 0) => {
  const where = familyId
    ? { OR: [{ user_id: userId }, { family_id: familyId }], is_active: true }
    : { user_id: userId, family_id: null, is_active: true };

  const [items, total] = await Promise.all([
    prisma.debt.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.debt.count({ where }),
  ]);

  return { items, total, limit, offset };
};

const createDebt = async (userId, familyId, data) => {
  if (!data.name || !data.total_amount || !data.start_date) {
    throw new ValidationError('Обязательны: название, сумма, дата начала');
  }

  // Семейный scope возможен только при наличии семьи (соло → всегда personal).
  const scope = (familyId && data.scope === 'family') ? 'family' : 'personal';

  return await prisma.$transaction(async (tx) => {
    const debt = await tx.debt.create({
      data: {
        user_id: userId,
        family_id: scope === 'personal' ? null : familyId,
        scope,
        name: data.name,
        total_amount: data.total_amount,
        remaining: data.remaining || data.total_amount,
        interest_rate: data.interest_rate,
        monthly_payment: data.monthly_payment,
        type: data.type || 'credit',
        start_date: new Date(data.start_date),
        end_date: data.end_date ? new Date(data.end_date) : null,
        notes: data.notes,
      },
    });

    if (data.create_recurring && data.monthly_payment && data.category_id) {
      const day = data.day_of_month ? Number(data.day_of_month) : new Date(data.start_date).getDate();
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const validDay = Math.min(day, lastDay);

      await tx.recurringTransaction.create({
        data: {
          user_id: userId,
          family_id: scope === 'personal' ? null : familyId,
          category_id: data.category_id,
          amount: data.monthly_payment,
          type: 'expense',
          day_of_month: validDay,
          start_month: new Date(data.start_date).toISOString().slice(0, 7),
          comment: `Платёж по кредиту: ${data.name}`,
          scope,
          debt_id: debt.id,
        },
      });
    }

    return debt;
  });
};

const updateDebt = async (id, userId, familyId, data) => {
  const where = familyId
    ? { id, OR: [{ user_id: userId }, { family_id: familyId }] }
    : { id, user_id: userId };

  const existing = await prisma.debt.findFirst({ where });
  if (!existing) throw new NotFoundError('Долг не найден');

  const updates = {};
  if (data.remaining !== undefined) updates.remaining = data.remaining;
  if (data.monthly_payment !== undefined) updates.monthly_payment = data.monthly_payment;
  if (data.is_active !== undefined) updates.is_active = data.is_active;
  if (data.notes !== undefined) updates.notes = data.notes;
  updates.updated_at = new Date();

  return prisma.debt.update({
    where: { id },
    data: updates,
  });
};

const deleteDebt = async (id, userId, familyId) => {
  const where = familyId
    ? { id, OR: [{ user_id: userId }, { family_id: familyId }] }
    : { id, user_id: userId };

  const existing = await prisma.debt.findFirst({ where });
  if (!existing) throw new NotFoundError('Долг не найден');

  return prisma.debt.update({
    where: { id },
    data: { is_active: false },
  });
};

const closePartial = async (id, userId, familyId, amount, accountId = null) => {
  const whereFilter = familyId
    ? { id, OR: [{ user_id: userId }, { family_id: familyId }] }
    : { id, user_id: userId };

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.debt.findFirst({
      where: whereFilter,
      include: { recurring_payments: true },
    });
    if (!existing) throw new NotFoundError('Долг не найден');

    const currentRemaining = Number(existing.remaining);
    const closeAmount = Math.min(amount, currentRemaining);
    const newRemaining = Math.max(0, currentRemaining - closeAmount);
    const isNowClosed = newRemaining <= 0;

    const updated = await tx.debt.update({
      where: { id },
      data: {
        remaining: String(newRemaining),
        updated_at: new Date(),
        ...(isNowClosed ? { is_active: false } : {}),
      },
    });

    let catId = null;
    if (existing.recurring_payments && existing.recurring_payments.length > 0) {
      catId = existing.recurring_payments[0].category_id;
    }
    if (!catId) {
      let cat = await tx.category.findFirst({ where: { name: 'Погашение кредита', family_id: existing.family_id } });
      if (!cat) {
        cat = await tx.category.create({ data: { name: 'Погашение кредита', family_id: existing.family_id, type: 'expense' } });
      }
      catId = cat.id;
    }

    await tx.transaction.create({
      data: {
        user_id: userId,
        family_id: existing.family_id,
        account_id: accountId ? Number(accountId) : null,
        category_id: catId,
        amount: closeAmount,
        type: 'expense',
        date: new Date(),
        comment: `Частичное погашение: ${existing.name}`,
        scope: existing.family_id ? 'family' : 'personal',
      },
    });

    if (accountId) {
      await tx.account.update({
        where: { id: Number(accountId) },
        data: { balance: { decrement: closeAmount } },
      });
    }

    return updated;
  });
};

const getTotalDebt = async (userId, familyId) => {
  const where = familyId
    ? { OR: [{ user_id: userId }, { family_id: familyId }], is_active: true }
    : { user_id: userId, is_active: true };

  const agg = await prisma.debt.aggregate({
    where,
    _sum: { remaining: true },
  });

  return Number(agg._sum?.remaining || 0);
};

module.exports = {
  getDebts,
  createDebt,
  updateDebt,
  deleteDebt,
  closePartial,
  getTotalDebt,
};