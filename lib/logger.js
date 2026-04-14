const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino/file',
    options: { destination: 1 }
  } : undefined,
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