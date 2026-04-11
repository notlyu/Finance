const { Transaction, Category, User, Goal, GoalContribution, Budget } = require('../lib/models');
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

    const baseFind = {
        where: whereClause,
        include: [
            { model: Category, as: 'Category', attributes: ['id', 'name'] },
            { model: User, as: 'User', attributes: ['id', 'name'] },
        ],
        order: [['date', 'DESC'], ['id', 'DESC']],
    };

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
                user_name: t.User?.name || 'Участник',
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
            category_name: t.Category?.name || 'Без категории',
            user_id: t.user_id,
            user_name: t.User?.name || '',
        };
    };

    if (!paginate) {
        const rows = await Transaction.findAll({ ...baseFind, limit, offset });
        return rows.map(mapTx);
    }

    const { rows, count } = await Transaction.findAndCountAll({ ...baseFind, limit, offset });
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
                const spent = await Transaction.sum('amount', { where: spentWhere }) || 0;

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
    const t = await Transaction.findOne({
        where: familyId
            ? { id, OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
            : { id, family_id: null, user_id: userId },
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
            user_name: t.User?.name || 'Участник',
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
        category_name: t.Category?.name || 'Без категории',
        user_id: t.user_id,
        user_name: t.User?.name || '',
    };
};

exports.updateTransaction = async (id, familyId, userId, data) => {
    const where = familyId
        ? { id, OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
        : { id, family_id: null, user_id: userId };
    const transaction = await Transaction.findOne({ where });
    if (!transaction) throw new Error('Transaction not found');

    // Защита: нельзя подменить user_id или family_id
    const safeData = { ...data };
    delete safeData.user_id;
    delete safeData.family_id;

    await transaction.update(safeData);
    const updated = await Transaction.findOne({ where });
    if (updated) {
      // Recalculate auto contributions if this is income
      if (updated.type === 'income') {
        await recalculateAutoContribsFromIncome(id);
      } else {
        // If it's not income anymore, drop related auto contributions
        await revertAutoContribsForIncome(id);
      }
    }
    return updated;
};

exports.deleteTransaction = async (id, familyId, userId) => {
    const where = familyId
        ? { id, OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
        : { id, family_id: null, user_id: userId };
    const transaction = await Transaction.findOne({ where });
    if (!transaction) throw new Error('Transaction not found');
    // If this is an income, revert any auto-contributions linked to it
    if (transaction.type === 'income') {
      await revertAutoContribsForIncome(transaction.id);
    }
    return await transaction.destroy();
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
  const tx = await Transaction.findOne({ where: { id: transactionId } });
  if (!tx || tx.type !== 'income') return;

  const contributions = await GoalContribution.findAll({
    where: { source_transaction_id: transactionId },
    include: [{ model: Goal, as: 'Goal' }]
  });

  for (const c of contributions) {
    const goal = c.Goal;
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
      await c.update({ amount: newAmountAuto, date: tx.date });
      const delta = newAmountAuto - oldAmount;
      await goal.update({ current_amount: (parseFloat(goal.current_amount || 0) + delta) });
    }
  }
}

// Remove all auto-contributions tied to a specific income transaction (e.g., on delete)
async function revertAutoContribsForIncome(transactionId) {
  const tx = await Transaction.findOne({ where: { id: transactionId } });
  if (!tx) return;
  const contributions = await GoalContribution.findAll({ where: { source_transaction_id: transactionId }, include: [{ model: Goal, as: 'Goal' }] });
  for (const c of contributions) {
    const goal = c.Goal;
    const amount = parseFloat(c.amount) || 0;
    if (goal) {
      await goal.update({ current_amount: (parseFloat(goal.current_amount || 0) - amount) });
    }
    await c.destroy();
  }
}
