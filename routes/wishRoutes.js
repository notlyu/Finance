const express = require('express');
const wishController = require('../controllers/wishController');
const authMiddleware = require('../middleware/auth');
const { validateMiddleware, validateObjectId } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', wishController.getWishes);
router.get('/:id', validateObjectId, wishController.getWishById);
router.get('/export', wishController.exportWishes);
router.post('/', validateMiddleware('wish', 'create'), wishController.createWish);
router.put('/:id', validateObjectId, validateMiddleware('wish', 'update'), wishController.updateWish);
router.delete('/:id', validateObjectId, wishController.deleteWish);
router.post('/:id/contribute', validateObjectId, wishController.contributeToWish);
router.post('/:id/fund', validateObjectId, wishController.fundWish);

module.exports = router;