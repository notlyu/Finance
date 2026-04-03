const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/settings', notificationController.getSettings);
router.put('/settings', notificationController.updateSettings);

module.exports = router;
