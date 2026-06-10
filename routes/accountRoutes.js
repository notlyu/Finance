const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const accountController = require('../controllers/accountController');
const { validateMiddleware, validateObjectId, validateQuery } = require('../lib/validation');

router.use(authMiddleware);

router.get('/', validateQuery('accounts'), accountController.getAccounts);
router.post('/', validateMiddleware('account', 'create'), accountController.createAccount);
router.patch('/:id', validateObjectId, validateMiddleware('account', 'update'), accountController.updateAccount);
router.delete('/:id', validateObjectId, accountController.deleteAccount);

module.exports = router;
