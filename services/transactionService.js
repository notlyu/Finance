const { Transaction, Category, User, Goal, GoalContribution, Budget, prisma } = require('../lib/models');
const { Op } = require('../lib/models');

exports.getTransactions = async (userId, familyId, query = {}) => {
    const whereClause = familyId
        ? { OR: [{ family_id: familyId }, { AND: [{ family_id: null }, { user_id: userId }] }] }
        : { family_id: null, user_id: userId };

    // Filter by specific member if requested
    if (query.memberId && query.memberId !== userId) {
        whereClause.user_id = query.memberId;
    }

    // Filters
    if (query.type) whereClause.type = query.type;

    const categoryIds = parseIdList(query.categoryIds);
    if (categoryIds.length) {
        whereClause.category_id = { in: categoryIds };
    } else if (query.categoryId) {
        whereClause.category_id = query.categoryId;
    }

    if (query.minAmount || query.maxAmount) {
        whereClause.amount = {};
        if (query.minAmount) whereClause.amount.gte = Number(query.minAmount);
        if (query.maxAmount) whereClause.amount.lte = Number(query.maxAmount);
    }

    if (query.q) {
        whereClause.comment = { contains: String(query.q) };
    }

    // Date filtering
    if (query.startDate && query.endDate) {
        whereClause.date = { gte: new Date(query.startDate), lte: new Date(query.endDate) };
    } else if (query.startDate) {
        whereClause.date = { gte: new Date(query.startDate) };
    } else if (query.endDate) {
        whereClause.date = { lte: new Date(query.endDate) };
    }

    // Privacy filtering:
    // - user always sees own private
    // - other users' private are returned as hidden (or excluded by includePrivate)
    const includePrivate = String(query.includePrivate || 'all');
    if (includePrivate === 'only_private') {
        whereClause.is_private = true;
        whereClause.user_id = userId;
    } else if (includePrivate === 'only_visible') {
        whereClause.OR = [
            { is_private: false },
            { user_id: userId },
        ];
    } else {
        // all: return all, but hide other users' private in mapper below
    }

    const limit = clampInt(query.limit, 50, 1, 200);
    const offset = clampInt(query.offset, 0, 0, 1_000_000);
    const paginate = String(query.paginate || '') === 'true';

    const mapTx = (t) => {
        const isOtherUsersPrivate = !!t.is_private && t.user_id !== userId;
        if (isOtherUsersPrivate) {
            return {
                id: t.id,
                date: t.date,
                type: t.type,
                amount: null,
                comment: null,
                is_private: true,
                is_hidden: true,
                category_id: t.category_id,
                category_name: 'Скрыто',
                user_id: t.user_id,
                user_name: t.user?.name || 'Участник',
            };
        }

        return {
            id: t.id,
            date: t.date,
            type: t.type,
            amount: t.amount,
            comment: t.comment,
            is_private: !!t.is_private,
            is_hidden: false,
            category_id: t.category_id,
            category_name: t.category?.name || 'Без категории',
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
    // Ensure date is stored as YYYY-MM-DD string for DATEONLY column
    let txDate;
    if (data && data.date) {
        txDate = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date).slice(0, 10);
    } else {
        const now = new Date();
        txDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // Budget check for expense transactions
    let budgetWarning = null;
    if (data.type === 'expense' && data.category_id) {
        try {
            const month = txDate.slice(0, 7); // "YYYY-MM"
            const budgetWhere = familyId
                ? {
                    OR: [
                        { family_id: familyId, category_id: data.category_id, type: 'expense', month },
                        { family_id: null, user_id: userId, category_id: data.category_id, type: 'expense', month },
                    ],
                }
                : { family_id: null, user_id: userId, category_id: data.category_id, type: 'expense', month };
            const budget = await Budget.findOne({ where: budgetWhere });
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
            // Budget check is non-blocking
            console.error('Budget check failed:', err);
        }
    }

    const tx = await Transaction.create({ 
        ...data, 
        user_id: userId, 
        family_id: familyId,
        date: txDate
    });

  // Автопополнение целей на основе доходов
  // Только для доходных операций
  if (tx && tx.type === 'income') {
        try {
            // Найти все цели семейной/личной принадлежности с включенным автопополнением
            // Для семейных целей — только свои (добавляем user_id)
            const goals = await Goal.findAll({
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
                // Пропустим, если цель уже достигла сумму или нет смысла пополнять
                const remaining = parseFloat(goal.target_amount) - parseFloat(goal.current_amount || 0);
                if (!remaining || remaining <= 0) continue;

                let amountAuto = 0;
                const percent = parseFloat(goal.auto_contribute_value);
                if (goal.auto_contribute_type === 'percentage' && percent > 0) {
                    amountAuto = parseFloat(tx.amount) * (percent / 100);
                } else if (goal.auto_contribute_type === 'fixed' && percent > 0) {
                    amountAuto = percent; // в этом случае auto_contribute_value хранит фикс. сумму
                }
                if (amountAuto > 0) {
                    // Если уже есть автопополнение за этот income-transaction, пропустим
                    const existing = await GoalContribution.findOne({
                        where: {
                            goal_id: goal.id,
                            source_transaction_id: tx.id,
                        }
                    });
                    if (existing) continue;

                    // Создать запись вклада как automatic
                    await GoalContribution.create({
                        goal_id: goal.id,
                        amount: amountAuto,
                        date: tx.date,
                        automatic: true,
                        source_transaction_id: tx.id
                    });

                    // Обновить текущую сумму цели
                    const newAmount = (parseFloat(goal.current_amount || 0) + amountAuto);
                    await goal.update({ current_amount: newAmount });
                }
            }
        } catch (err) {
            // Не прерывать создание транзакции: автопополнение — опционально и не критично
            console.error('Auto-contribute failed:', err);
        }
    }

    // Обновляем подушку безопасности (если включено)
    try {
      const safety = require('./safetyPillowService');
      await safety.recalculateAndSave(tx.user_id, tx.family_id);
    } catch (e) {
      // пропускаем ошибки
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

    const isOtherUsersPrivate = !!t.is_private && t.user_id !== userId;
    if (isOtherUsersPrivate) {
        return {
            id: t.id,
            date: t.date,
            type: t.type,
            amount: null,
            comment: null,
            is_private: true,
            is_hidden: true,
            category_id: t.category_id,
            category_name: 'Скрыто',
            user_id: t.user_id,
            user_name: t.user?.name || 'Участник',
        };
    }

    return {
        id: t.id,
        date: t.date,
        type: t.type,
        amount: t.amount,
        comment: t.comment,
        is_private: !!t.is_private,
        is_hidden: false,
        category_id: t.category_id,
        category_name: t.category?.name || 'Без категории',
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

    // Защита: нельзя подменить user_id или family_id
    const safeData = { ...data };
    delete safeData.user_id;
    delete safeData.family_id;

    // Конвертировать типы данных
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
    
    // Вернуть с категорией
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

// Recalculate all auto-contributions tied to a specific income transaction
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

// Remove all auto-contributions tied to a specific income transaction (e.g., on delete)
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
