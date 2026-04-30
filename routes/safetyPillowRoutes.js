const express = require('express');
const safetyPillowController = require('../controllers/safetyPillowController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/settings', safetyPillowController.getSettings);
router.put('/settings', safetyPillowController.updateSettings);
router.get('/current', safetyPillowController.getSafetyPillow);
router.get('/history', safetyPillowController.getHistory);
router.post('/snapshot', safetyPillowController.createSnapshot);

module.exports = router;