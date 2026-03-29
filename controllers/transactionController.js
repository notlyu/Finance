const transactionService = require('../services/transactionService');

// Define your functions
const getTransactions = async (req, res, next) => {
    try {
        const transactions = await transactionService.getTransactions(req.user.id, req.user.familyId);
        res.json(transactions);
    } catch (error) {
        next(error);
    }
};

const createTransaction = async (req, res, next) => {
    try {
        const transaction = await transactionService.createTransaction(req.user.id, req.user.familyId, req.body);
        res.status(201).json(transaction);
    } catch (error) {
        next(error);
    }
};

const getTransactionById = async (req, res, next) => {
    try {
        const transaction = await transactionService.getTransactionById(req.params.id, req.user.familyId);
        res.json(transaction);
    } catch (error) {
        next(error);
    }
};

const updateTransaction = async (req, res, next) => {
    try {
        const transaction = await transactionService.updateTransaction(req.params.id, req.user.familyId, req.body);
        res.json(transaction);
    } catch (error) {
        next(error);
    }
};

const deleteTransaction = async (req, res, next) => {
    try {
        await transactionService.deleteTransaction(req.params.id, req.user.familyId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// CRITICAL: Export them as an object
module.exports = {
    getTransactions,
    createTransaction,
    getTransactionById,
    updateTransaction,
    deleteTransaction
};