const pino = require('pino');

const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
  level: isTest ? 'silent' : (process.env.LOG_LEVEL || 'info'),
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      id: req.id
    }),
    res: (res) => ({
      statusCode: res.statusCode
    }),
    err: (err) => ({
      type: err.type,
      message: err.message,
      stack: err.stack
    })
  }
});

module.exports = logger;