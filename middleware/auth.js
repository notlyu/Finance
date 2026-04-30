const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma-client');
const { UnauthorizedError, logger } = require('../lib/errors');

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
  }
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split('; ').reduce((acc, c) => {
      const [key, ...v] = c.split('=');
      if (key === 'token') acc[key] = decodeURIComponent(v.join('='));
      return acc;
    }, {});
    if (cookies.token) {
      return cookies.token;
    }
  }
  return null;
};

module.exports = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
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