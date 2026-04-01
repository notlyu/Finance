const express = require('express');
const authMiddleware = require('../middleware/auth');
const recurringController = require('../controllers/recurringController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', recurringController.getRecurring);
router.post('/', recurringController.createRecurring);
router.put('/:id', recurringController.updateRecurring);
router.delete('/:id', recurringController.deleteRecurring);

module.exports = router;

