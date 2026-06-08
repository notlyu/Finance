const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const debtService = require('../services/debtService');
const { validateMiddleware, validateObjectId } = require('../lib/validation');

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const result = await debtService.getDebts(req.user.id, req.user.family_id, limit, offset);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/', validateMiddleware('debt', 'create'), async (req, res, next) => {
  try {
    const debt = await debtService.createDebt(req.user.id, req.user.family_id, req.validated);
    res.status(201).json(debt);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', validateObjectId, validateMiddleware('debt', 'update'), async (req, res, next) => {
  try {
    const debt = await debtService.updateDebt(req.params.id, req.user.id, req.user.family_id, req.validated);
    res.json(debt);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', validateObjectId, async (req, res, next) => {
  try {
    await debtService.deleteDebt(req.params.id, req.user.id, req.user.family_id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/close-partial', validateObjectId, validateMiddleware('debt', 'closePartial'), async (req, res, next) => {
  try {
    const debt = await debtService.closePartial(req.params.id, req.user.id, req.user.family_id, req.validated.amount, req.body.account_id);
    res.json(debt);
  } catch (error) {
    next(error);
  }
});

module.exports = router;