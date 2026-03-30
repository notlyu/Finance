const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

// Все маршруты требуют аутентификации
router.use(authMiddleware);

router.get('/', transactionController.getTransactions);
router.get('/:id', transactionController.getTransactionById);
router.post('/', transactionController.createTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;