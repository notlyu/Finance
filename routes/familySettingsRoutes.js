const express = require('express');
const familySettingsController = require('../controllers/familySettingsController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', familySettingsController.getFamilySettings);
router.put('/', familySettingsController.updateFamilySettings);

module.exports = router;
