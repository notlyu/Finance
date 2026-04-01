const { Transaction, Category, User } = require('../models');
const { Op } = require('sequelize');

exports.getTransactions = async (userId, familyId, query = {}) => {
    const whereClause = { family_id: familyId };

    // Filters
    if (query.type) whereClause.type = query.type;

    const categoryIds = parseIdList(query.categoryIds);
    if (categoryIds.length) {
        whereClause.category_id = { [Op.in]: categoryIds };
    } else if (query.categoryId) {
        whereClause.category_id = query.categoryId;
    }

    if (query.minAmount || query.maxAmount) {
        whereClause.amount = {};
        if (query.minAmount) whereClause.amount[Op.gte] = Number(query.minAmount);
        if (query.maxAmount) whereClause.amount[Op.lte] = Number(query.maxAmount);
    }

    if (query.q) {
        whereClause.comment = { [Op.like]: `%${String(query.q)}%` };
    }

    // Date filtering
    if (query.startDate && query.endDate) {
        whereClause.date = { [Op.between]: [query.startDate, query.endDate] };
    } else if (query.startDate) {
        whereClause.date = { [Op.gte]: query.startDate };
    } else if (query.endDate) {
        whereClause.date = { [Op.lte]: query.endDate };
    }

    // Privacy filtering:
    // - user always sees own private
    // - other users' private are returned as hidden (or excluded by includePrivate)
    const includePrivate = String(query.includePrivate || 'all');
    if (includePrivate === 'only_private') {
        whereClause.is_private = true;
        whereClause.user_id = userId;
    } else if (includePrivate === 'only_visible') {
        whereClause[Op.or] = [
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
    // Create the transaction record
    return await Transaction.create({ 
        ...data, 
        user_id: userId, 
        family_id: familyId 
    });
};

exports.getTransactionById = async (id, familyId, userId) => {
    const t = await Transaction.findOne({
        where: { id, family_id: familyId },
        include: [
            { model: Category, as: 'Category', attributes: ['id', 'name'] },
            { model: User, as: 'User', attributes: ['id', 'name'] },
        ],
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

exports.updateTransaction = async (id, familyId, data) => {
    const transaction = await Transaction.findOne({ where: { id, family_id: familyId } });
    if (!transaction) throw new Error('Transaction not found');
    return await transaction.update(data);
};

exports.deleteTransaction = async (id, familyId) => {
    const transaction = await Transaction.findOne({ where: { id, family_id: familyId } });
    if (!transaction) throw new Error('Transaction not found');
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