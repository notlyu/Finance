const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/', dashboardController.getDashboard);
router.get('/available-funds', dashboardController.getAvailableFunds);

module.exports = router;
