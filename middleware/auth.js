const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma-client');
const { UnauthorizedError, logger } = require('../lib/errors');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || req.query?.token;
    if (!token) {
      throw new UnauthorizedError();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { family: true },
    });
    if (!user) {
      throw new UnauthorizedError('Пользователь не найден');
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn({ url: req.url, error: err.message }, 'Auth failed');
    next(err);
  }
};