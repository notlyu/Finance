const transactionService = require('../services/transactionService');

exports.getTransactions = async (req, res) => {
  try {
    const { user } = req;
    if (!user.family_id) return res.status(400).json({ message: 'Вы не состоите в семье' });
    
    const result = await transactionService.getTransactions(user.id, user.family_id, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { user } = req;
    if (!user.family_id) return res.status(400).json({ message: 'Вы не состоите в семье' });

    // Simple Input Validation
    const { amount, type, category_id } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Сумма обязательна' });
    if (!['income', 'expense'].includes(type)) return res.status(400).json({ message: 'Неверный тип' });
    if (!category_id) return res.status(400).json({ message: 'Выберите категорию' });

    const transaction = await transactionService.createTransaction(user.id, user.family_id, req.body);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};