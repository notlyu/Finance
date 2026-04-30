const prisma = require('../lib/prisma-client');
const { logger, ValidationError } = require('../lib/errors');

exports.getAccounts = async (req, res, next) => {
  try {
    const user = req.user;
    const accounts = await prisma.account.findMany({
      where: {
        is_active: true,
        OR: [
          { user_id: user.id, family_id: null },
          { family_id: user.family_id }
        ]
      },
      orderBy: { created_at: 'desc' }
    });
    logger.info(`User ${user.id} fetched ${accounts.length} accounts`);
    res.json(accounts);
  } catch (error) {
    next(error);
  }
};

exports.createAccount = async (req, res, next) => {
  try {
    const user = req.user;
    const { name, type, balance, currency, scope: reqScope, is_liquid } = req.body;
    if (!name || !type) {
      throw new ValidationError('Name and type are required');
    }
    const scope = reqScope || 'personal';
    const account = await prisma.account.create({
      data: {
        user_id: user.id,
        family_id: scope !== 'personal' && user.family_id ? user.family_id : null,
        name,
        type: type || 'bank',
        balance: balance || 0,
        currency: currency || 'RUB',
        scope,
        is_liquid: is_liquid !== undefined ? !!is_liquid : true,
      }
    });
    logger.info(`User ${user.id} created account ${account.id}`);
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
};

exports.updateAccount = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { name, type, balance, currency, scope: reqScope, is_active, is_liquid } = req.body;
    const account = await prisma.account.findFirst({
      where: {
        id: Number(id),
        OR: [
          { user_id: user.id, family_id: null, scope: 'personal' },
          { family_id: user.family_id, scope: { in: ['family', 'shared'] } }
        ]
      }
    });
    if (!account) {
      throw new Error('Account not found');
    }
    const scope = reqScope || account.scope || 'personal';
    const updated = await prisma.account.update({
      where: { id: Number(id) },
      data: {
        name: name || account.name,
        type: type || account.type,
        balance: balance !== undefined ? balance : account.balance,
        currency: currency || account.currency,
        scope,
        is_liquid: is_liquid !== undefined ? is_liquid : account.is_liquid,
        is_active: is_active !== undefined ? is_active : account.is_active,
        updated_at: new Date(),
      }
    });
    logger.info(`User ${user.id} updated account ${id}`);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const account = await prisma.account.findFirst({
      where: {
        id: Number(id),
        OR: [
          { user_id: user.id, family_id: null },
          { family_id: user.family_id }
        ]
      }
    });
    if (!account) {
      throw new Error('Account not found');
    }
    // Soft delete
    await prisma.account.update({
      where: { id: Number(id) },
      data: { is_active: false, updated_at: new Date() }
    });
    logger.info(`User ${user.id} deleted account ${id}`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
