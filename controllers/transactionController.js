const transactionService = require('../services/transactionService');
const auditService = require('../services/auditService');
const { logger, NotFoundError, ValidationError, UnauthorizedError } = require('../lib/errors');

const getTransactions = async (req, res, next) => {
    if (!req.user) {
        throw new UnauthorizedError();
    }
    try {
        const transactions = await transactionService.getTransactions(req.user.id, req.user.family_id, req.query);
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
        const result = await transactionService.createTransaction(req.user.id, req.user.family_id, req.body);
        
        logger.info({ 
            userId: req.user.id, 
            transactionId: result.tx?.id, 
            type: result.tx?.type,
            action: 'createTransaction' 
        });

        if (result.tx) {
            auditService.logTransaction(req.user.id, 'create', result.tx.id, null, result.tx, req);
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
        const transaction = await transactionService.updateTransaction(req.params.id, req.user.family_id, req.user.id, req.body);
        
        logger.info({ 
            userId: req.user.id, 
            transactionId: transaction?.id, 
            action: 'updateTransaction' 
        });

        if (transaction) {
            auditService.logTransaction(req.user.id, 'update', transaction.id, oldTx, transaction, req);
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
        }
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTransactions,
    createTransaction,
    getTransactionById,
    updateTransaction,
    deleteTransaction
};