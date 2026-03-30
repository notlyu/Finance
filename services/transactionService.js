const { Transaction, Op } = require('../models'); // Ensure Op is imported if using Sequelize

exports.getTransactions = async (userId, familyId, query) => {
    const whereClause = { family_id: familyId };

    // Add filtering logic
    if (query.type) whereClause.type = query.type;
    if (query.categoryId) whereClause.category_id = query.categoryId;
    
    // Add date filtering if provided
    if (query.startDate && query.endDate) {
        whereClause.date = {
            [Op.between]: [query.startDate, query.endDate]
        };
    }

    return await Transaction.findAll({ 
        where: whereClause,
        order: [['date', 'DESC']] // Changed to 'date' for consistency
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