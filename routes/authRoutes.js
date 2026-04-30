const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { validateMiddleware, validateObjectId, validateMemberId } = require('../lib/validation');

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         email:
 *           type: string
 *         name:
 *           type: string
 *         token:
 *           type: string
 *         refreshToken:
 *           type: string
 *         refreshTokenExpiresAt:
 *           type: string
 *           format: date-time
 */

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Успешная регистрация
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       409:
 *         description: Email уже зарегистрирован
 */

const authStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Слишком много попыток, попробуйте через 15 минут' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Слишком много попыток регистрации, попробуйте через час' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', 
  registrationLimiter,
  validateMiddleware('auth', 'register'), 
  authController.register
);

router.post('/login', 
  authStrictLimiter,
  validateMiddleware('auth', 'login'), 
  authController.login
);

router.post('/change-password', 
  authMiddleware, 
  validateMiddleware('auth', 'changePassword'), 
  authController.changePassword
);

router.post('/forgot-password', 
  authStrictLimiter,
  validateMiddleware('auth', 'login'), 
  authController.forgotPassword
);

router.post('/reset-password', 
  authStrictLimiter,
  authController.resetPassword
);

router.get('/me', authMiddleware, authController.getMe);

router.post('/family/create', 
  authMiddleware, 
  validateMiddleware('auth', 'createFamily'), 
  authController.createFamily
);

router.post('/family/join', 
  authMiddleware, 
  validateMiddleware('auth', 'joinFamily'), 
  authController.joinFamily
);

router.post('/family/leave', authMiddleware, authController.leaveFamily);

router.post('/family/invites', authMiddleware, authController.createFamilyInvite);

router.get('/family/invites', authMiddleware, authController.listFamilyInvites);

router.delete('/family/invites/:id', authMiddleware, validateObjectId, authController.revokeFamilyInvite);

router.delete('/family/members/:memberId', authMiddleware, validateMemberId, authController.removeFamilyMember);

router.post('/family/transfer-ownership', authMiddleware, authController.transferOwnership);

router.post('/refresh-token', authController.refreshToken);

router.post('/revoke-token', authController.revokeToken);

router.post('/logout', authMiddleware, authController.logout);

module.exports = router;