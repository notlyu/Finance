const express = require('express');
const familySettingsController = require('../controllers/familySettingsController');
const authMiddleware = require('../middleware/auth');
const { validateMiddleware } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', familySettingsController.getFamilySettings);
router.patch('/', validateMiddleware('familySettings', 'update'), familySettingsController.updateFamilySettings);

module.exports = router;
