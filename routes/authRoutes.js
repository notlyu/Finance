const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { validateMiddleware } = require('../lib/validation');

const router = express.Router();

router.post('/register', 
  validateMiddleware('auth', 'register'), 
  authController.register
);

router.post('/login', 
  validateMiddleware('auth', 'login'), 
  authController.login
);

router.post('/change-password', 
  authMiddleware, 
  validateMiddleware('auth', 'changePassword'), 
  authController.changePassword
);

router.post('/forgot-password', 
  validateMiddleware('auth', 'login'), 
  authController.forgotPassword
);

router.post('/reset-password', 
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

router.delete('/family/invites/:id', authMiddleware, authController.revokeFamilyInvite);

router.delete('/family/members/:memberId', authMiddleware, authController.removeFamilyMember);

router.post('/family/transfer-ownership', authMiddleware, authController.transferOwnership);

module.exports = router;