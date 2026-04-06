const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Публичные маршруты
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/change-password', authMiddleware, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Защищённые маршруты (требуют JWT)
router.get('/me', authMiddleware, authController.getMe);
router.post('/family/create', authMiddleware, authController.createFamily);
router.post('/family/join', authMiddleware, authController.joinFamily);
router.post('/family/leave', authMiddleware, authController.leaveFamily);
router.post('/family/invites', authMiddleware, authController.createFamilyInvite);
router.get('/family/invites', authMiddleware, authController.listFamilyInvites);
router.delete('/family/invites/:id', authMiddleware, authController.revokeFamilyInvite);
router.delete('/family/members/:memberId', authMiddleware, authController.removeFamilyMember);
router.post('/family/transfer-ownership', authMiddleware, authController.transferOwnership);

module.exports = router;