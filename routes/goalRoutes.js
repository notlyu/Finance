const express = require('express');
const goalController = require('../controllers/goalController');
const authMiddleware = require('../middleware/auth');
const { validateMiddleware, validateObjectId, validateQuery } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', validateQuery('goals'), goalController.getGoals);
router.get('/:id', validateObjectId, goalController.getGoalById);
router.get('/:id/forecast', validateObjectId, goalController.getForecast);
router.get('/export', goalController.exportGoals);
router.post('/', validateMiddleware('goal', 'create'), goalController.createGoal);
router.patch('/:id', validateObjectId, validateMiddleware('goal', 'update'), goalController.updateGoal);
router.delete('/:id', validateObjectId, goalController.deleteGoal);
router.post('/:id/contribute', validateObjectId, validateMiddleware('goal', 'contribute'), goalController.contributeToGoal);

module.exports = router;