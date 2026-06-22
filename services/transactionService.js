const prisma = require('../lib/prisma-client');
const { logger } = require('../lib/errors');
const { resolveScope, maskTransaction } = require('../lib/scope');

// Режим прозрачности семьи: если включён, личные операции партнёра НЕ маскируются.
// По умолчанию (false) — маскирование «🔒 факт операции» (R1 / ТЗ Логика семьи).
async function isFamilyTransparent(familyId) {
    if (!familyId) return false;
    const settings = await prisma.familySettings.findUnique({
        where: { family_id: familyId },
        select: { show_personal_in_stats: true },
    });
    return Boolean(settings?.show_personal_in_stats);
}
exports.isFamilyTransparent = isFamilyTransparent;

exports.getTransactions = async (userId, familyId, query = {}) => {
    const whereClause = familyId
        ? { OR: [{ family_id: familyId }, { AND: [{ family_id: null }, { user_id: userId }] }] }
        : { family_id: null, user_id: userId };

    if (query.memberId && query.memberId !== userId) {
        whereClause.user_id = query.memberId;
    }

    if (query.type) whereClause.type = query.type;

    const categoryIds = parseIdList(query.categoryIds);
    if (categoryIds.length) {
        whereClause.category_id = { in: categoryIds };
    } else if (query.categoryId) {
        whereClause.category_id = Number(query.categoryId);
    }

    if (query.minAmount || query.maxAmount) {
        whereClause.amount = {};
        if (query.minAmount) whereClause.amount.gte = Number(query.minAmount);
        if (query.maxAmount) whereClause.amount.lte = Number(query.maxAmount);
    }

    if (query.accountId) {
        whereClause.account_id = Number(query.accountId);
    }

    if (query.startDate && query.endDate) {
        const startDate = new Date(query.startDate + 'T00:00:00');
        const endDate = new Date(query.endDate + 'T23:59:59.999');
        whereClause.date = { gte: startDate, lte: endDate };
    } else if (query.startDate) {
        whereClause.date = { gte: new Date(query.startDate + 'T00:00:00') };
    } else if (query.endDate) {
        whereClause.date = { lte: new Date(query.endDate + 'T23:59:59.999') };
    }

    const includePrivate = String(query.includePrivate || 'all');
    // Frontend sends: 'all', 'my', 'family'
    // Backend expects: 'all', 'only_private', 'only_visible'
    if (includePrivate === 'only_private' || includePrivate === 'my') {
        whereClause.scope = 'personal';
        whereClause.user_id = userId;
    } else if (includePrivate === 'only_visible' || includePrivate === 'family') {
        whereClause.OR = [
            { scope: 'family' },
            { user_id: userId },
        ];
    }

    if (query.q) {
        const searchStr = String(query.q);
        const searchNum = Number(searchStr);
        const conditions = [
            { comment: { contains: searchStr } },
            { category: { name: { contains: searchStr } } },
        ];
        if (!isNaN(searchNum)) {
            conditions.push({ amount: searchNum });
        }
        if (whereClause.OR) {
            whereClause.AND = whereClause.AND || [];
            whereClause.AND.push({ OR: conditions });
        } else {
            whereClause.OR = conditions;
        }
    }

    const limit = clampInt(query.limit, 50, 1, 200);
    const offset = clampInt(query.offset, 0, 0, 1_000_000);
    const paginate = String(query.paginate || '') === 'true';

    const transparent = await isFamilyTransparent(familyId);
    const mapTx = (t) => maskTransaction(t, userId, transparent);

    if (!paginate) {
        const rows = await prisma.transaction.findMany({
            where: whereClause,
            include: { category: true, user: true, account: { select: { name: true } } },
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            take: limit,
            skip: offset,
        });
        return rows.map(mapTx);
    }

    const [rows, count] = await Promise.all([
        prisma.transaction.findMany({
            where: whereClause,
            include: { category: true, user: true, account: { select: { name: true } } },
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            take: limit,
            skip: offset,
        }),
        prisma.transaction.count({ where: whereClause }),
    ]);
    const items = rows.map(mapTx);
    return {
        items,
        meta: {
            total: count,
            limit,
            offset,
            hasMore: offset + items.length < count,
        },
    };
};

exports.createTransaction = async (userId, familyId, data) => {
    let txDate;
    if (data && data.date) {
        if (data.date instanceof Date) {
            txDate = data.date;
        } else {
            const d = new Date(data.date);
            txDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }
    } else {
        txDate = new Date();
    }

    // Привязка к счёту: проверяем, что счёт доступен пользователю (свой личный
    // или семейный), иначе не привязываем чужой/несуществующий счёт.
    let accountScope = null;
    if (data.account_id) {
        const accWhere = familyId
            ? { id: Number(data.account_id), OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
            : { id: Number(data.account_id), family_id: null, user_id: userId };
        const acc = await prisma.account.findFirst({ where: accWhere, select: { scope: true } });
        if (!acc) {
            delete data.account_id;
        } else {
            accountScope = acc.scope;
        }
    }
    // F4/§4: итоговый scope — единая точка (явный > scope счёта > personal;
    // соло-пользователь всегда personal, даже если прислал scope='family').
    data.scope = resolveScope({ familyId, requestedScope: data.scope, accountScope });

    // Проверка бюджетного предупреждения ПЕРЕД транзакцией (read-only, не требует атомарности)
    let budgetWarning = null;
    if (data.type === 'expense' && data.category_id) {
        try {
            const month = txDate instanceof Date
                ? `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`
                : String(txDate).slice(0, 7);
            const budgetWhere = familyId
                ? {
                    OR: [
                        { family_id: familyId, category_id: data.category_id, type: 'expense', month },
                        { family_id: null, user_id: userId, category_id: data.category_id, type: 'expense', month },
                    ],
                }
                : { family_id: null, user_id: userId, category_id: data.category_id, type: 'expense', month };
            const budget = await prisma.budget.findFirst({ where: budgetWhere });
            if (budget) {
                const monthStr = month;
                const monthStart = `${monthStr}-01`;
                const nextMonth = new Date(`${monthStr}-15`);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

                const spentWhere = familyId
                    ? {
                        OR: [
                            { family_id: familyId, category_id: data.category_id, type: 'expense', date: { gte: new Date(monthStart), lt: new Date(monthEnd) } },
                            { family_id: null, user_id: userId, category_id: data.category_id, type: 'expense', date: { gte: new Date(monthStart), lt: new Date(monthEnd) } },
                        ],
                      }
                    : { family_id: null, user_id: userId, category_id: data.category_id, type: 'expense', date: { gte: new Date(monthStart), lt: new Date(monthEnd) } };
                const spentAgg = await prisma.transaction.aggregate({
                    where: spentWhere,
                    _sum: { amount: true }
                });
                const spent = spentAgg._sum?.amount || 0;
                const newTotal = Number(spent) + Number(data.amount);
                const limitAmt = Number(budget.limit_amount);
                if (newTotal > limitAmt) {
                    budgetWarning = {
                        exceeded: true,
                        category_id: data.category_id,
                        spent: Number(spent),
                        newTotal,
                        limit: limitAmt,
                        overBy: newTotal - limitAmt,
                    };
                }
            }
        } catch (err) {
            logger.error({ err }, 'Budget check failed');
        }
    }

    // Атомарная операция: создание транзакции + автопополнение целей
    const { tx } = await prisma.$transaction(async (prismaTx) => {
        const created = await prismaTx.transaction.create({
            data: {
                ...data,
                user_id: userId,
                family_id: familyId,
                date: txDate,
            },
        });

        const appliedGoalUpdates = [];

        if (created.type === 'income') {
            const goals = await prismaTx.goal.findMany({
                where: familyId
                    ? {
                        OR: [
                            { family_id: familyId, user_id: userId },
                            { user_id: userId, family_id: null },
                        ],
                        auto_contribute_enabled: true,
                        is_archived: false,
                    }
                    : {
                        user_id: userId,
                        family_id: null,
                        auto_contribute_enabled: true,
                        is_archived: false,
                    },
            });

            for (const goal of goals) {
                const remaining = parseFloat(goal.target_amount) - parseFloat(goal.current_amount || 0);
                if (!remaining || remaining <= 0) continue;

                let amountAuto = 0;
                const val = parseFloat(goal.auto_contribute_value);
                if (goal.auto_contribute_type === 'percentage' && val > 0) {
                    amountAuto = parseFloat(created.amount) * (val / 100);
                } else if (goal.auto_contribute_type === 'fixed' && val > 0) {
                    amountAuto = val;
                }
                if (amountAuto <= 0) continue;

                const newAmount = parseFloat(goal.current_amount || 0) + amountAuto;
                await prismaTx.goalContribution.create({
                    data: {
                        goal_id: goal.id,
                        user_id: userId,
                        amount: amountAuto,
                        transaction_id: created.id,
                    },
                });
                await prismaTx.goal.update({
                    where: { id: goal.id },
                    data: { current_amount: newAmount },
                });
                appliedGoalUpdates.push({ goalId: goal.id, amount: amountAuto });
            }
        }

        return { tx: created, goalUpdates: appliedGoalUpdates };
    });

    // Пересчёт подушки безопасности (вне транзакции — некритично)
    try {
        const safety = require('./safetyPillowService');
        await safety.recalculateAndSave(tx.user_id, tx.family_id);
    } catch (e) {
        logger.warn({ err: e }, 'Safety pillow recalc failed after createTransaction');
    }

    return { tx, budgetWarning };
};

exports.getTransactionById = async (id, familyId, userId) => {
    const where = familyId
        ? { id, OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
        : { id, family_id: null, user_id: userId };
    
    const t = await prisma.transaction.findFirst({ 
        where,
        include: { category: true, user: true, account: { select: { name: true } } }
    });
    if (!t) return null;

    const transparent = await isFamilyTransparent(familyId);
    return maskTransaction(t, userId, transparent);
};

exports.updateTransaction = async (id, familyId, userId, data) => {
    const txId = Number(id);
    if (!Number.isInteger(txId) || txId <= 0) {
        throw new Error('Invalid transaction ID');
    }

    const where = familyId
        ? { id: txId, OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
        : { id: txId, family_id: null, user_id: userId };

    return await prisma.$transaction(async (tx) => {
        const existing = await tx.transaction.findFirst({ where });
        if (!existing) throw new Error('Transaction not found');

        const safeData = { ...data };
        delete safeData.user_id;
        delete safeData.family_id;

        if (safeData.date) safeData.date = new Date(safeData.date);
        if (safeData.amount) safeData.amount = Number(safeData.amount);
        if (safeData.category_id) safeData.category_id = Number(safeData.category_id);

        // §4.2/F4: пересчитываем scope через единую точку, чтобы PATCH не обходил правило
        // «общего котла» (с семейного счёта операцию нельзя сделать личной/скрытой;
        // соло-пользователь — всегда personal).
        let accountScope = null;
        const effectiveAccountId = safeData.account_id !== undefined ? safeData.account_id : existing.account_id;
        if (familyId && effectiveAccountId) {
            const acc = await tx.account.findFirst({
                where: { id: Number(effectiveAccountId), OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] },
                select: { scope: true },
            });
            if (!acc) {
                if (safeData.account_id !== undefined) delete safeData.account_id;
            } else {
                accountScope = acc.scope;
            }
        }
        const requestedScope = safeData.scope !== undefined ? safeData.scope : existing.scope;
        safeData.scope = resolveScope({ familyId, requestedScope, accountScope });

        const updated = await tx.transaction.update({
            where: { id: txId },
            data: safeData,
        });

        if (updated.type === 'income') {
            await recalculateAutoContribsFromIncome(txId, tx);
        } else {
            await revertAutoContribsForIncome(txId, tx);
        }

        return tx.transaction.findUnique({
            where: { id: txId },
            include: { category: true, user: true, account: { select: { name: true } } },
        });
    });
};

exports.batchDeleteTransactions = async (ids, familyId, userId) => {
    const numIds = ids.map(Number).filter(id => Number.isInteger(id) && id > 0);
    if (numIds.length === 0) throw new Error('No valid transaction IDs');

    const where = familyId
        ? { id: { in: numIds }, OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
        : { id: { in: numIds }, family_id: null, user_id: userId };

    return await prisma.$transaction(async (tx) => {
        const transactions = await tx.transaction.findMany({ where, select: { id: true, type: true } });
        const incomeIds = transactions.filter(t => t.type === 'income').map(t => t.id);

        // Откатываем авто-контрибьюшны ДО удаления транзакций,
        // иначе revert не найдёт транзакцию (и связь transaction_id обнулится по SetNull).
        for (const incomeId of incomeIds) {
            await revertAutoContribsForIncome(incomeId, tx);
        }

        await tx.transaction.deleteMany({ where: { id: { in: transactions.map(t => t.id) } } });

        return { deleted: transactions.length };
    });
};

exports.deleteTransaction = async (id, familyId, userId) => {
    const txId = Number(id);
    if (!Number.isInteger(txId) || txId <= 0) {
        throw new Error('Invalid transaction ID');
    }

    const where = familyId
        ? { id: txId, OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
        : { id: txId, family_id: null, user_id: userId };

    return await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.findFirst({ where });
        if (!transaction) throw new Error('Transaction not found');

        if (transaction.type === 'income') {
            await revertAutoContribsForIncome(transaction.id, tx);
        }

        return await tx.transaction.delete({ where: { id: txId } });
    });
};

function parseIdList(value) {
    if (!value) return [];
    return String(value)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => Number(s))
        .filter(n => Number.isInteger(n) && n > 0);
}

function clampInt(value, fallback, min, max) {
    const n = Number.parseInt(String(value ?? ''), 10);
    const v = Number.isFinite(n) ? n : fallback;
  return Math.max(min, Math.min(max, v));
}

async function recalculateAutoContribsFromIncome(transactionId, prismaTx) {
  const db = prismaTx || prisma;
  try {
    const tx = await db.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.type !== 'income') return;

    const contributions = await db.goalContribution.findMany({
      where: { transaction_id: transactionId },
      include: { goal: true }
    });

    for (const c of contributions) {
      const goal = c.goal;
      if (!goal) continue;

      const oldAmount = parseFloat(c.amount) || 0;
      const remaining = (parseFloat(goal.target_amount) - parseFloat(goal.current_amount || 0));
      let newAmountAuto = 0;
      const t = goal.auto_contribute_type;
      const v = parseFloat(goal.auto_contribute_value || 0);
      if (t === 'percentage' && v > 0) {
        newAmountAuto = parseFloat(tx.amount) * (v / 100);
      } else if (t === 'fixed' && v > 0) {
        newAmountAuto = v;
      }
      if (newAmountAuto > remaining) newAmountAuto = remaining > 0 ? remaining : 0;
      if (newAmountAuto < 0) newAmountAuto = 0;

      if (newAmountAuto !== oldAmount) {
        await db.goalContribution.update({
          where: { id: c.id },
          data: { amount: newAmountAuto, date: tx.date }
        });
        const delta = newAmountAuto - oldAmount;
        await db.goal.update({
          where: { id: goal.id },
          data: { current_amount: (parseFloat(goal.current_amount || 0) + delta) }
        });
      }
    }
  } catch (e) {
    logger.error({ err: e }, 'recalculateAutoContribsFromIncome error');
    // Внутри транзакции — пробрасываем, чтобы откатить весь апдейт
    if (prismaTx) throw e;
  }
}

async function revertAutoContribsForIncome(transactionId, prismaTx) {
  const db = prismaTx || prisma;
  try {
    const tx = await db.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) return;
    const contributions = await db.goalContribution.findMany({
      where: { transaction_id: transactionId },
      include: { goal: true }
    });
    for (const c of contributions) {
      const goal = c.goal;
      const amount = parseFloat(c.amount) || 0;
      if (goal) {
        await db.goal.update({
          where: { id: goal.id },
          data: { current_amount: (parseFloat(goal.current_amount || 0) - amount) }
        });
      }
      await db.goalContribution.delete({ where: { id: c.id } });
    }
  } catch (e) {
    logger.error({ err: e }, 'revertAutoContribsForIncome error');
    // Внутри транзакции — пробрасываем, чтобы откатить весь апдейт
    if (prismaTx) throw e;
  }
}
