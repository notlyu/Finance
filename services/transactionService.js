// services/transactionService.js
const { Transaction, Goal } = require('../models');

exports.getTransactions = async (userId, familyId, query) => {
    // Basic implementation: adjust based on your filtering requirements
    return await Transaction.findAll({ 
        where: { family_id: familyId },
        order: [['created_at', 'DESC']]
    });
};

exports.createTransaction = async (userId, familyId, data) => {
    // Create the transaction record
    return await Transaction.create({ 
        ...data, 
        user_id: userId, 
        family_id: familyId 
    });
};

exports.getTransactionById = async (id, familyId) => {
    return await Transaction.findOne({ where: { id, family_id: familyId } });
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