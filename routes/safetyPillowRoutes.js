const express = require('express');
const safetyPillowController = require('../controllers/safetyPillowController');
const authMiddleware = require('../middleware/auth');
const { validateMiddleware } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/settings', safetyPillowController.getSettings);
router.patch('/settings', validateMiddleware('safetyPillow', 'updateSettings'), safetyPillowController.updateSettings);
// PUT оставлен как алиас для обратной совместимости (deprecated, удалить после миграции клиента)
router.put('/settings', validateMiddleware('safetyPillow', 'updateSettings'), safetyPillowController.updateSettings);
router.get('/current', safetyPillowController.getSafetyPillow);
router.get('/history', safetyPillowController.getHistory);
router.post('/snapshot', safetyPillowController.createSnapshot);

module.exports = router;