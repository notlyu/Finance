const { formatError, logger } = require('../lib/errors');

module.exports = (err, req, res, next) => {
  const errorInfo = formatError(err);
  
  if (!err.isOperational) {
    logger.error({
      err: {
        message: err.message,
        stack: err.stack,
        type: err.name,
      },
      req: {
        method: req.method,
        url: req.url,
        headers: req.headers,
      },
    });
  } else {
    logger.warn({
      message: err.message,
      code: err.code,
      url: req.url,
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json(errorInfo);
};