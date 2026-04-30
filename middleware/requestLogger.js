const { logger } = require('../lib/errors');

const SENSITIVE_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password'];

module.exports = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    if (statusCode >= 400 && !SENSITIVE_PATHS.includes(url)) {
      logger.warn({
        type: 'request',
        method,
        url,
        statusCode,
        duration,
        ip: req.headers['x-forwarded-for'] || ip,
        userAgent: req.headers['user-agent'],
      });
    }
  });

  next();
};
