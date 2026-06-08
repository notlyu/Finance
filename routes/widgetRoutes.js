const express = require('express');
const widgetConfigController = require('../controllers/widgetConfigController');
const authMiddleware = require('../middleware/auth');
const { validateMiddleware } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', widgetConfigController.getWidgetConfig);
router.patch('/', validateMiddleware('widget', 'update'), widgetConfigController.updateWidgetConfig);

module.exports = router;
