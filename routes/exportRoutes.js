const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const exportController = require('../controllers/exportController');

router.use(authMiddleware);

router.get('/transactions', exportController.exportTransactions);
router.get('/goals', exportController.exportGoals);
router.get('/wishes', exportController.exportWishes);
router.get('/budgets', exportController.exportBudgets);

module.exports = router;