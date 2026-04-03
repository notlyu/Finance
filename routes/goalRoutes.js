const express = require('express');
const goalController = require('../controllers/goalController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', goalController.getGoals);
router.get('/:id', goalController.getGoalById);
router.get('/:id/forecast', goalController.getForecast);
router.get('/export', goalController.exportGoals);
router.post('/', goalController.createGoal);
router.put('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);
router.post('/:id/contribute', goalController.contributeToGoal);

module.exports = router;
