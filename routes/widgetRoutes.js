const express = require('express');
const widgetConfigController = require('../controllers/widgetConfigController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', widgetConfigController.getWidgetConfig);
router.put('/', widgetConfigController.updateWidgetConfig);

module.exports = router;
