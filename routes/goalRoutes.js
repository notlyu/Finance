const express = require('express');
const goalController = require('../controllers/goalController');
const authMiddleware = require('../middleware/auth');
const { validateMiddleware } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', goalController.getGoals);
router.get('/:id', goalController.getGoalById);
router.get('/:id/forecast', goalController.getForecast);
router.get('/export', goalController.exportGoals);
router.post('/', validateMiddleware('goal', 'create'), goalController.createGoal);
router.put('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);
router.post('/:id/contribute', validateMiddleware('goal', 'contribute'), goalController.contributeToGoal);

module.exports = router;