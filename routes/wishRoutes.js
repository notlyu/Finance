const express = require('express');
const wishController = require('../controllers/wishController');
const authMiddleware = require('../middleware/auth');
const { validateMiddleware } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', wishController.getWishes);
router.get('/:id', wishController.getWishById);
router.get('/export', wishController.exportWishes);
router.post('/', validateMiddleware('wish', 'create'), wishController.createWish);
router.put('/:id', wishController.updateWish);
router.delete('/:id', wishController.deleteWish);
router.post('/:id/contribute', wishController.contributeToWish);
router.post('/:id/fund', wishController.fundWish);

module.exports = router;