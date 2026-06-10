require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const prisma = require('./lib/prisma-client');
const { logger } = require('./lib/errors');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initSocket } = require('./lib/socket');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./lib/swagger');
const scopeMiddleware = require('./middleware/scopeMiddleware');

// Импорт маршрутов
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const goalRoutes = require('./routes/goalRoutes');
const wishRoutes = require('./routes/wishRoutes');
const safetyPillowRoutes = require('./routes/safetyPillowRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const reportRoutes = require('./routes/reportRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const recurringRoutes = require('./routes/recurringRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const debtRoutes = require('./routes/debtRoutes');
const importRoutes = require('./routes/importRoutes');
const exportRoutes = require('./routes/exportRoutes');
const accountRoutes = require('./routes/accountRoutes');
const widgetRoutes = require('./routes/widgetRoutes');
const familySettingsRoutes = require('./routes/familySettingsRoutes');
const cron = require('node-cron');
const { runRecurringOnce } = require('./jobs/recurringJob');
const { runInterestMonthly } = require('./jobs/interestJob');
const { runSnapshotMonthly } = require('./jobs/snapshotJob');
const { processScheduledJobs } = require('./services/failedJobService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  ...(process.env.NODE_ENV === 'production' ? {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
  } : {}),
}));
app.use(cookieParser());
app.use(requestLogger);

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (corsOrigins.length === 0 && process.env.NODE_ENV === 'production') {
  logger.error('CORS_ORIGINS must be set in production');
  process.exit(1);
}

app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Слишком много запросов, попробуйте позже' },
});
app.use('/api/auth', authLimiter);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Слишком много запросов, попробуйте позже' },
});
app.use('/api/', apiLimiter);

// API Documentation
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Finance API Docs',
  }));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// Scope middleware — устанавливает req.scope из URL до всех маршрутов
app.use(scopeMiddleware);

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/wishes', wishRoutes);
app.use('/api/safety-pillow', safetyPillowRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/widget-config', widgetRoutes);
app.use('/api/family-settings', familySettingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/import', importRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/accounts', accountRoutes);

// Scoped routes: /api/personal/* и /api/family/* (req.scope уже выставлен scopeMiddleware)
// Dashboard
app.use('/api/personal/dashboard', dashboardRoutes);
app.use('/api/family/dashboard', dashboardRoutes);
// Transactions
app.use('/api/personal/transactions', transactionRoutes);
app.use('/api/family/transactions', transactionRoutes);
// Goals
app.use('/api/personal/goals', goalRoutes);
app.use('/api/family/goals', goalRoutes);
// Budgets
app.use('/api/personal/budgets', budgetRoutes);
app.use('/api/family/budgets', budgetRoutes);
// Recurring
app.use('/api/personal/recurring', recurringRoutes);
app.use('/api/family/recurring', recurringRoutes);
// Debts
app.use('/api/personal/debts', debtRoutes);
app.use('/api/family/debts', debtRoutes);
// Safety Pillow
app.use('/api/personal/safety-pillow', safetyPillowRoutes);
app.use('/api/family/safety-pillow', safetyPillowRoutes);
// Analytics / Reports
app.use('/api/personal/reports', reportRoutes);
app.use('/api/family/reports', reportRoutes);
// Wishes
app.use('/api/personal/wishes', wishRoutes);
app.use('/api/family/wishes', wishRoutes);

// Global error handler (must be after routes)
app.use(errorHandler);

// Проверка подключения к БД
prisma.$connect()
  .then(() => logger.info('Подключение к PostgreSQL (Prisma) успешно'))
  .catch(err => logger.error({ err }, 'Ошибка подключения к PostgreSQL'));

// Job status tracking
const jobStatus = {
  recurring: { lastRun: null, lastSuccess: null, lastError: null, status: 'idle' },
  interest: { lastRun: null, lastSuccess: null, lastError: null, status: 'idle' },
  snapshot: { lastRun: null, lastSuccess: null, lastError: null, status: 'idle' },
};

// Daily recurring transactions job (03:05 server time)
if (process.env.ENABLE_RECURRING_JOB !== 'false') {
  cron.schedule('5 3 * * *', async () => {
    jobStatus.recurring.lastRun = new Date().toISOString();
    jobStatus.recurring.status = 'running';
    try {
      const result = await runRecurringOnce();
      jobStatus.recurring.lastSuccess = new Date().toISOString();
      jobStatus.recurring.status = 'success';
      logger.info({ created: result.created }, 'Recurring job completed');
    } catch (e) {
      jobStatus.recurring.lastError = e.message;
      jobStatus.recurring.status = 'error';
      logger.error({ err: e }, 'Recurring job error');
    }
  });
}

// Monthly interest accrual for goals (01:05 on the 1st day of every month)
if (process.env.ENABLE_INTEREST_JOB !== 'false') {
  cron.schedule('5 1 1 * *', async () => {
    jobStatus.interest.lastRun = new Date().toISOString();
    jobStatus.interest.status = 'running';
    try {
      const result = await runInterestMonthly();
      jobStatus.interest.lastSuccess = new Date().toISOString();
      jobStatus.interest.status = 'success';
      logger.info({ processed: result.processed, month: result.month }, 'Interest job completed');
    } catch (e) {
      jobStatus.interest.lastError = e.message;
      jobStatus.interest.status = 'error';
      logger.error({ err: e }, 'Interest job error');
    }
  });
}

// Monthly SafetyPillowSnapshot (01:15 on the 1st day of every month — after interest job)
if (process.env.ENABLE_SNAPSHOT_JOB !== 'false') {
  cron.schedule('15 1 1 * *', async () => {
    jobStatus.snapshot.lastRun = new Date().toISOString();
    jobStatus.snapshot.status = 'running';
    try {
      const result = await runSnapshotMonthly();
      jobStatus.snapshot.lastSuccess = new Date().toISOString();
      jobStatus.snapshot.status = 'success';
      logger.info({ personal: result.personal, family: result.family }, 'Snapshot job completed');
    } catch (e) {
      jobStatus.snapshot.lastError = e.message;
      jobStatus.snapshot.status = 'error';
      logger.error({ err: e }, 'Snapshot job error');
    }
  });
}

// Retry failed jobs every 5 minutes
if (process.env.ENABLE_RETRY_JOB !== 'false') {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const results = await processScheduledJobs();
      if (results.length > 0) {
        logger.info({ count: results.length }, 'Retry job processed');
      }
    } catch (e) {
      logger.error({ err: e }, 'Retry job error');
    }
  });
}

// Graceful shutdown
let isShuttingDown = false;
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown initiated');
  try {
    await prisma.$disconnect();
  } catch (e) {
    logger.error({ err: e }, 'Prisma disconnect error');
  }
  try {
    const { pool } = require('./lib/prisma-client');
    await pool.end();
  } catch (e) {
    logger.error({ err: e }, 'Pool drain error');
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Process-level error handlers — без них процесс падает молча
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception — shutting down');
  shutdown('uncaughtException');
});

// Тестовый маршрут
app.get('/', (req, res) => {
  res.send('Сервер работает!');
});

// Health check с проверкой БД
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected', time: new Date().toISOString() });
  }
});

// Prometheus метрики (защищено METRICS_TOKEN — для scraper'ов)
app.get('/metrics', async (req, res) => {
  const expected = process.env.METRICS_TOKEN;
  if (expected) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token !== expected) {
      return res.status(401).send('# Unauthorized');
    }
  } else if (process.env.NODE_ENV === 'production') {
    // В проде без токена метрики недоступны — чтобы не утекали счётчики
    return res.status(404).send('# Not found');
  }
  try {
    const userCount = await prisma.user.count();
    const transactionCount = await prisma.transaction.count();
    const goalCount = await prisma.goal.count();
    const wishCount = await prisma.wish.count();
    const familyCount = await prisma.family.count();
    
    res.type('text/plain').send(`
# HELP finance_users_total Total users
# TYPE finance_users_total gauge
finance_users_total ${userCount}
# HELP finance_transactions_total Total transactions
# TYPE finance_transactions_total gauge
finance_transactions_total ${transactionCount}
# HELP finance_goals_total Total goals
# TYPE finance_goals_total gauge
finance_goals_total ${goalCount}
# HELP finance_wishes_total Total wishes
# TYPE finance_wishes_total gauge
finance_wishes_total ${wishCount}
# HELP finance_families_total Total families
# TYPE finance_families_total gauge
finance_families_total ${familyCount}
# HELP finance_uptime_seconds Server uptime
# TYPE finance_uptime_seconds gauge
finance_uptime_seconds ${process.uptime()}
`.trim());
  } catch {
    res.status(500).send('# Error collecting metrics');
  }
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  const checks = {
    database: { status: 'unknown' },
    memory: { status: 'unknown' },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database.status = 'ok';
  } catch {
    checks.database.status = 'error';
  }

  const memUsage = process.memoryUsage();
  checks.memory = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
  };

  res.json({
    status: checks.database.status === 'ok' ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/jobs', (req, res) => {
  res.json({
    jobs: jobStatus,
    serverUptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Сервер запущен');
});
