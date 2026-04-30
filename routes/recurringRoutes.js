const express = require('express');
const authMiddleware = require('../middleware/auth');
const recurringController = require('../controllers/recurringController');
const { validateMiddleware, validateObjectId } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', recurringController.getRecurring);
router.post('/', validateMiddleware('recurring', 'create'), recurringController.createRecurring);
router.put('/:id', validateObjectId, validateMiddleware('recurring', 'update'), recurringController.updateRecurring);
router.delete('/:id', validateObjectId, recurringController.deleteRecurring);

module.exports = router;

