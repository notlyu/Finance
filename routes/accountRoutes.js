const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const accountController = require('../controllers/accountController');

router.use(authMiddleware);

router.get('/', accountController.getAccounts);
router.post('/', accountController.createAccount);
router.put('/:id', accountController.updateAccount);
router.delete('/:id', accountController.deleteAccount);

module.exports = router;
