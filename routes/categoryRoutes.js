const express = require('express');
const authMiddleware = require('../middleware/auth');
const { validateMiddleware, validateObjectId, validateQuery } = require('../lib/validation');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', validateQuery('categories'), categoryController.list);

router.post('/', validateMiddleware('category', 'create'), categoryController.create);

router.patch('/:id', validateObjectId, validateMiddleware('category', 'update'), categoryController.update);

router.delete('/:id', validateObjectId, categoryController.remove);

module.exports = router;
