const prisma = require('../lib/prisma-client');

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

    if (query.q) {
        whereClause.comment = { contains: String(query.q) };
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
            { scope: { in: ['family', 'shared'] } },
            { user_id: userId },
        ];
    }

    const limit = clampInt(query.limit, 50, 1, 200);
    const offset = clampInt(query.offset, 0, 0, 1_000_000);
    const paginate = String(query.paginate || '') === 'true';

    const mapTx = (t) => {
        const isOtherUsersPrivate = t.scope === 'personal' && t.user_id !== userId;
        if (isOtherUsersPrivate) {
            return {
                id: t.id,
                date: t.date,
                type: t.type,
                amount: null,
                comment: null,
                scope: 'personal',
                is_hidden: true,
                category_id: t.category_id,
                category_name: '╨í╨║╤Ç╤ï╤é╨╛',
                user_id: t.user_id,
                user_name: t.user?.name || '╨ú╤ç╨░╤ü╤é╨╜╨╕╨║',
            };
        }

        return {
            id: t.id,
            date: t.date,
            type: t.type,
            amount: t.amount,
            comment: t.comment,
            scope: t.scope,
            is_hidden: false,
            category_id: t.category_id,
            category_name: t.category?.name || '╨æ╨╡╨╖ ╨║╨░╤é╨╡╨│╨╛╤Ç╨╕╨╕',
            user_id: t.user_id,
            user_name: t.user?.name || '',
        };
    };

    if (!paginate) {
        const rows = await prisma.transaction.findMany({
            where: whereClause,
            include: { category: true, user: true },
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            take: limit,
            skip: offset,
        });
        return rows.map(mapTx);
    }

    const [rows, count] = await Promise.all([
        prisma.transaction.findMany({
            where: whereClause,
            include: { category: true, user: true },
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

    let budgetWarning = null;
    if (data.type === 'expense' && data.category_id) {
        try {
            const month = txDate.slice(0, 7);
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
                const monthStart = `${month}-01`;
                const nextMonth = new Date(`${month}-15`);
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
                const limit = Number(budget.limit_amount);
                if (newTotal > limit) {
                    budgetWarning = {
                        exceeded: true,
                        category_id: data.category_id,
                        spent: Number(spent),
                        newTotal,
                        limit,
                        overBy: newTotal - limit,
                    };
                }
            }
        } catch (err) {
            console.error('Budget check failed:', err);
        }
    }

    const tx = await prisma.transaction.create({
        data: {
            ...data,
            user_id: userId,
            family_id: familyId,
            date: txDate
        }
    }).catch(err => { console.error('TX CREATE ERROR:', err.message, err.stack); throw err; });

    if (tx && tx.type === 'income') {
        try {
            const goals = await prisma.goal.findMany({
                where: familyId
                    ? {
                        OR: [
                            { family_id: familyId, user_id: userId },
                            { user_id: userId, family_id: null }
                        ],
                        auto_contribute_enabled: true
                    }
                    : {
                        user_id: userId,
                        family_id: null,
                        auto_contribute_enabled: true
                    }
            });

            for (const goal of goals) {
                const remaining = parseFloat(goal.target_amount) - parseFloat(goal.current_amount || 0);
                if (!remaining || remaining <= 0) continue;

                let amountAuto = 0;
                const percent = parseFloat(goal.auto_contribute_value);
                if (goal.auto_contribute_type === 'percentage' && percent > 0) {
                    amountAuto = parseFloat(tx.amount) * (percent / 100);
                } else if (goal.auto_contribute_type === 'fixed' && percent > 0) {
                    amountAuto = percent;
                }
                if (amountAuto > 0) {
                    const existing = await prisma.goalContribution.findFirst({
                        where: {
                            goal_id: goal.id,
                            source_transaction_id: tx.id,
                        }
                    });
                    if (existing) continue;

                    await prisma.goalContribution.create({
                        data: {
                            goal_id: goal.id,
                            user_id: userId,
                            amount: amountAuto,
                            date: tx.date,
                            automatic: true,
                            source_transaction_id: tx.id
                        }
                    });

                    const newAmount = (parseFloat(goal.current_amount || 0) + amountAuto);
                    await prisma.goal.update({
                        where: { id: goal.id },
                        data: { current_amount: newAmount }
                    });
                }
            }
        } catch (err) {
            console.error('Auto-contribute failed:', err);
        }
    }

    try {
        const safety = require('./safetyPillowService');
        await safety.recalculateAndSave(tx.user_id, tx.family_id);
    } catch (e) {
    }

    return { tx, budgetWarning };
};

exports.getTransactionById = async (id, familyId, userId) => {
    const where = familyId
        ? { id, OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
        : { id, family_id: null, user_id: userId };
    
    const t = await prisma.transaction.findFirst({ 
        where,
        include: { category: true, user: true }
    });
    if (!t) return null;

    const isOtherUsersPrivate = t.scope === 'personal' && t.user_id !== userId;
    if (isOtherUsersPrivate) {
        return {
            id: t.id,
            date: t.date,
            type: t.type,
            amount: null,
            comment: null,
            scope: 'personal',
            is_hidden: true,
            category_id: t.category_id,
            category_name: '╨í╨║╤Ç╤ï╤é╨╛',
            user_id: t.user_id,
            user_name: t.user?.name || '╨ú╤ç╨░╤ü╤é╨╜╨╕╨║',
        };
    }

    return {
        id: t.id,
        date: t.date,
        type: t.type,
        amount: t.amount,
        comment: t.comment,
        scope: t.scope,
        is_hidden: false,
        category_id: t.category_id,
        category_name: t.category?.name || '╨æ╨╡╨╖ ╨║╨░╤é╨╡╨│╨╛╤Ç╨╕╨╕',
        user_id: t.user_id,
        user_name: t.user?.name || '',
    };
};

exports.updateTransaction = async (id, familyId, userId, data) => {
    const txId = Number(id);
    if (!Number.isInteger(txId) || txId <= 0) {
        throw new Error('Invalid transaction ID');
    }

    const where = familyId
        ? { id: txId, OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
        : { id: txId, family_id: null, user_id: userId };
    
    const existing = await prisma.transaction.findFirst({ where });
    if (!existing) throw new Error('Transaction not found');

    const safeData = { ...data };
    delete safeData.user_id;
    delete safeData.family_id;

    if (safeData.date) safeData.date = new Date(safeData.date);
    if (safeData.amount) safeData.amount = Number(safeData.amount);
    if (safeData.category_id) safeData.category_id = Number(safeData.category_id);

    const updated = await prisma.transaction.update({
        where: { id: txId },
        data: safeData,
    });
    
    if (updated.type === 'income') {
        await recalculateAutoContribsFromIncome(txId);
    } else {
        await revertAutoContribsForIncome(txId);
    }
    
    return prisma.transaction.findUnique({
        where: { id: txId },
        include: { category: true, user: true },
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
    
    const transaction = await prisma.transaction.findFirst({ where });
    if (!transaction) throw new Error('Transaction not found');
    
    if (transaction.type === 'income') {
        await revertAutoContribsForIncome(transaction.id);
    }
    
    return await prisma.transaction.delete({ where: { id: txId } });
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

async function recalculateAutoContribsFromIncome(transactionId) {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.type !== 'income') return;

    const contributions = await prisma.goalContribution.findMany({
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
        await prisma.goalContribution.update({
          where: { id: c.id },
          data: { amount: newAmountAuto, date: tx.date }
        });
        const delta = newAmountAuto - oldAmount;
        await prisma.goal.update({
          where: { id: goal.id },
          data: { current_amount: (parseFloat(goal.current_amount || 0) + delta) }
        });
      }
    }
  } catch (e) {
    console.error('recalculateAutoContribsFromIncome error:', e.message);
  }
}

async function revertAutoContribsForIncome(transactionId) {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) return;
    const contributions = await prisma.goalContribution.findMany({
      where: { transaction_id: transactionId },
      include: { goal: true }
    });
    for (const c of contributions) {
      const goal = c.goal;
      const amount = parseFloat(c.amount) || 0;
      if (goal) {
        await prisma.goal.update({
          where: { id: goal.id },
          data: { current_amount: (parseFloat(goal.current_amount || 0) - amount) }
        });
      }
      await prisma.goalContribution.delete({ where: { id: c.id } });
    }
  } catch (e) {
    console.error('revertAutoContribsForIncome error:', e.message);
  }
}
