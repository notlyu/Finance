const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Публичные маршруты
router.post('/register', authController.register);
router.post('/login', authController.login);

// Защищённые маршруты (требуют JWT)
router.get('/me', authMiddleware, authController.getMe);
router.post('/family/create', authMiddleware, authController.createFamily);
router.post('/family/join', authMiddleware, authController.joinFamily);

module.exports = router;