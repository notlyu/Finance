const transactionService = require('../services/transactionService');
const auditService = require('../services/auditService');
const { emitFamilyUpdate } = require('../lib/socket');
const { logger, NotFoundError, ValidationError, UnauthorizedError } = require('../lib/errors');

// Realtime для семьи (#9): уведомляем остальных участников об изменении общих данных.
// Личные операции НЕ шлём — приватность (партнёр не получает realtime-сигнал о личном).
function notifyFamily(req, resource) {
    if (!req.user?.family_id) return;
    try {
        emitFamilyUpdate(req.user.family_id, 'family_update', { resource, by: req.user.id }, req.user.id);
    } catch (e) {
        logger.warn({ err: e }, 'family_update emit failed');
    }
}

const getTransactions = async (req, res, next) => {
    if (!req.user) {
        throw new UnauthorizedError();
    }
    try {
        const transactions = await transactionService.getTransactions(req.user.id, req.user.family_id, req.validatedQuery || req.query);
        res.json(transactions);
    } catch (error) {
        next(error);
    }
};

const createTransaction = async (req, res, next) => {
    if (!req.user) {
        throw new UnauthorizedError();
    }
    try {
        const result = await transactionService.createTransaction(req.user.id, req.user.family_id, req.validated);
        
        logger.info({ 
            userId: req.user.id, 
            transactionId: result.tx?.id, 
            type: result.tx?.type,
            action: 'createTransaction' 
        });

        if (result.tx) {
            auditService.logTransaction(req.user.id, 'create', result.tx.id, null, result.tx, req);
            if (result.tx.scope !== 'personal') notifyFamily(req, 'transactions');
        }

        const response = { transaction: result.tx };
        if (result.budgetWarning) {
            response.budgetWarning = result.budgetWarning;
        }
        res.status(201).json(response);
    } catch (error) {
        next(error);
    }
};

const getTransactionById = async (req, res, next) => {
    if (!req.user) {
        throw new UnauthorizedError();
    }
    try {
        const transaction = await transactionService.getTransactionById(req.params.id, req.user.family_id, req.user.id);
        if (!transaction) {
            throw new NotFoundError('Transaction not found');
        }
        res.json(transaction);
    } catch (error) {
        next(error);
    }
};

const updateTransaction = async (req, res, next) => {
    if (!req.user) {
        throw new UnauthorizedError();
    }
    try {
        const oldTx = await transactionService.getTransactionById(req.params.id, req.user.family_id, req.user.id);
        const transaction = await transactionService.updateTransaction(req.params.id, req.user.family_id, req.user.id, req.validated);
        
        logger.info({ 
            userId: req.user.id, 
            transactionId: transaction?.id, 
            action: 'updateTransaction' 
        });

        if (transaction) {
            auditService.logTransaction(req.user.id, 'update', transaction.id, oldTx, transaction, req);
            // Шлём, если операция семейная сейчас ИЛИ была семейной до правки.
            if (transaction.scope !== 'personal' || oldTx?.scope !== 'personal') notifyFamily(req, 'transactions');
        }

        res.json(transaction);
    } catch (error) {
        next(error);
    }
};

const deleteTransaction = async (req, res, next) => {
    if (!req.user) {
        throw new UnauthorizedError();
    }
    try {
        const oldTx = await transactionService.getTransactionById(req.params.id, req.user.family_id, req.user.id);
        await transactionService.deleteTransaction(req.params.id, req.user.family_id, req.user.id);
        
        logger.info({ 
            userId: req.user.id, 
            transactionId: req.params.id, 
            action: 'deleteTransaction' 
        });

        if (oldTx) {
            auditService.logTransaction(req.user.id, 'delete', Number(req.params.id), oldTx, null, req);
            if (oldTx.scope !== 'personal') notifyFamily(req, 'transactions');
        }

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

const batchDeleteTransactions = async (req, res, next) => {
    if (!req.user) {
        throw new UnauthorizedError();
    }
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new ValidationError('ids must be a non-empty array');
        }
        const result = await transactionService.batchDeleteTransactions(ids, req.user.family_id, req.user.id);
        
        logger.info({
            userId: req.user.id,
            count: result.deleted,
            action: 'batchDeleteTransactions'
        });

        // Пакет мог содержать семейные операции — уведомляем семью (без разбора по scope).
        if (result.deleted > 0) notifyFamily(req, 'transactions');

        res.json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTransactions,
    createTransaction,
    getTransactionById,
    updateTransaction,
    deleteTransaction,
    batchDeleteTransactions
};