const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // ИМПОРТ MIDDLEWARE
const transactionController = require('../controllers/transactionController');

// Все маршруты требуют аутентификации
router.use(authMiddleware);

router.get('/', auth, transactionController.getTransactions);
router.post('/', auth, transactionController.createTransaction);
router.get('/', transactionController.getTransactions);
router.get('/:id', transactionController.getTransactionById);
router.post('/', transactionController.createTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;