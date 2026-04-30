const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const debtService = require('../services/debtService');

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const debts = await debtService.getDebts(req.user.id, req.user.family_id);
    res.json(debts);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const debt = await debtService.createDebt(req.user.id, req.user.family_id, req.body);
    res.status(201).json(debt);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const debt = await debtService.updateDebt(Number(req.params.id), req.user.id, req.user.family_id, req.body);
    res.json(debt);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await debtService.deleteDebt(Number(req.params.id), req.user.id, req.user.family_id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/close-partial', async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) throw new Error('Invalid amount');
    const debt = await debtService.closePartial(Number(req.params.id), req.user.id, req.user.family_id, Number(amount));
    res.json(debt);
  } catch (error) {
    next(error);
  }
});

module.exports = router;