const prisma = require('../lib/prisma-client');
const debtService = require('../services/debtService');

exports.getDebts = async (req, res, next) => {
  try {
    const debts = await debtService.getDebts(req.user.id, req.user.family_id);
    res.json(debts);
  } catch (error) {
    next(error);
  }
};

exports.createDebt = async (req, res, next) => {
  try {
    const debt = await debtService.createDebt(req.user.id, req.user.family_id, req.body);
    res.status(201).json(debt);
  } catch (error) {
    next(error);
  }
};

exports.updateDebt = async (req, res, next) => {
  try {
    const debt = await debtService.updateDebt(Number(req.params.id), req.user.id, req.user.family_id, req.body);
    res.json(debt);
  } catch (error) {
    next(error);
  }
};

exports.deleteDebt = async (req, res, next) => {
  try {
    // Cascade delete related recurring transactions
    await prisma.recurringTransaction.deleteMany({
      where: { debt_id: Number(req.params.id) }
    });
    await debtService.deleteDebt(Number(req.params.id), req.user.id, req.user.family_id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

exports.closePartial = async (req, res, next) => {
  try {
    const { amount, account_id } = req.body;
    if (!amount || amount <= 0) {
      throw new Error('Amount must be positive');
    }
    const debt = await debtService.closePartial(
      Number(req.params.id), req.user.id, req.user.family_id, Number(amount), account_id
    );
    res.json(debt);
  } catch (error) {
    next(error);
  }
};