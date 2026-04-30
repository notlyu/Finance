const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');
const { validateObjectId, validateMiddleware } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/settings', notificationController.getSettings);
router.put('/settings', validateMiddleware('notification', 'updateSettings'), notificationController.updateSettings);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', validateObjectId, notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', validateObjectId, notificationController.deleteNotification);

module.exports = router;
