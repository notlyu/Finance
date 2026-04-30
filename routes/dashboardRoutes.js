const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// Main dashboard - backward compatible
router.get('/', dashboardController.getDashboard);

// Personal space dashboard
router.get('/personal', dashboardController.getDashboard);

// Family space dashboard  
router.get('/family', dashboardController.getDashboard);

module.exports = router;
