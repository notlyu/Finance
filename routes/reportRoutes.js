const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/dynamics', reportController.getDynamics);
router.get('/expenses-by-category', reportController.getExpensesByCategory);
router.get('/income-by-category', reportController.getIncomeByCategory);

module.exports = router;