const { formatError, logger } = require('../lib/errors');

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'x-csrf-token', 'x-refresh-token'];

const sanitizeHeaders = (headers) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

module.exports = (err, req, res, _next) => {
  const errorInfo = formatError(err);

  if (!err.isOperational) {
    logger.error({
      err: {
        message: err.message,
        stack: err.stack,
        type: err.name,
      },
      req: {
        method: req?.method,
        url: req?.url,
        headers: sanitizeHeaders(req?.headers || {}),
      },
    });
  } else {
    logger.warn({
      message: err.message,
      code: err.code,
      url: req?.url,
    });
  }

  // statusCode может прийти из formatError (маппинг Prisma-кодов) или из самой ошибки
  const { statusCode: mappedStatus, ...body } = errorInfo;
  const statusCode = err.statusCode || mappedStatus || 500;
  res.status(statusCode).json(body);
};