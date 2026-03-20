const express = require('express');
const wishController = require('../controllers/wishController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', wishController.getWishes);
router.get('/:id', wishController.getWishById);
router.post('/', wishController.createWish);
router.put('/:id', wishController.updateWish);
router.delete('/:id', wishController.deleteWish);
router.post('/:id/contribute', wishController.contributeToWish);

module.exports = router;