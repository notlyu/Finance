const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');
const { validateMiddleware, validateObjectId, validateQuery } = require('../lib/validation');

router.use(authMiddleware);

// Main transactions
router.get('/', validateQuery('transactions'), transactionController.getTransactions);
router.get('/:id', validateObjectId, transactionController.getTransactionById);
router.post('/', validateMiddleware('transaction', 'create'), transactionController.createTransaction);
router.patch('/:id', validateObjectId, validateMiddleware('transaction', 'update'), transactionController.updateTransaction);
router.delete('/:id', validateObjectId, transactionController.deleteTransaction);
router.post('/batch-delete', transactionController.batchDeleteTransactions);

// Personal space (alias - same controller)
router.get('/personal', validateQuery('transactions'), transactionController.getTransactions);
router.post('/personal', validateMiddleware('transaction', 'create'), transactionController.createTransaction);

// Family space (alias - same controller)
router.get('/family', validateQuery('transactions'), transactionController.getTransactions);
router.post('/family', validateMiddleware('transaction', 'create'), transactionController.createTransaction);

module.exports = router;