const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const accountController = require('../controllers/accountController');
const { validateMiddleware, validateObjectId } = require('../lib/validation');

router.use(authMiddleware);

router.get('/', accountController.getAccounts);
router.post('/', validateMiddleware('account', 'create'), accountController.createAccount);
router.patch('/:id', validateObjectId, validateMiddleware('account', 'update'), accountController.updateAccount);
router.delete('/:id', validateObjectId, accountController.deleteAccount);

module.exports = router;
