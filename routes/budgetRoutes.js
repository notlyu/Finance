const express = require('express');
const authMiddleware = require('../middleware/auth');
const budgetController = require('../controllers/budgetController');
const { validateMiddleware, validateObjectId } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', budgetController.getBudgets);
router.post('/', validateMiddleware('budget', 'create'), budgetController.createBudget);
router.put('/:id', validateObjectId, validateMiddleware('budget', 'update'), budgetController.updateBudget);
router.delete('/:id', validateObjectId, budgetController.deleteBudget);

module.exports = router;

