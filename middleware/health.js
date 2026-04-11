const prisma = require('../lib/prisma');

async function healthCheck(req, res, next) {
  const healthcheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'unknown',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    healthcheck.database = 'connected';
  } catch (error) {
    healthcheck.status = 'error';
    healthcheck.database = 'disconnected';
    healthcheck.error = error.message;
  }

  if (healthcheck.status === 'error') {
    return res.status(503).json(healthcheck);
  }

  res.json(healthcheck);
}

async function detailedHealth(req, res) {
  const checks = {
    database: { status: 'unknown' },
    memory: { status: 'unknown' },
    requests: { status: 'unknown' },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database.status = 'ok';
  } catch (e) {
    checks.database.status = 'error';
  }

  const memUsage = process.memoryUsage();
  checks.memory = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
  };

  res.json({
    status: checks.database.status === 'ok' ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  healthCheck,
  detailedHealth,
};