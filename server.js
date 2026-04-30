require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const prisma = require('./lib/prisma-client');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initSocket } = require('./lib/socket');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./lib/swagger');

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
const PORT = process.env.PORT || 5000;

// Middleware
app.disable('x-powered-by');
app.use(helmet());
app.use(cookieParser());
app.use(requestLogger);

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (corsOrigins.length === 0 && process.env.NODE_ENV === 'production') {
  console.error('CORS_ORIGINS must be set in production');
  process.exit(1);
}

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));

// Rate limiting (especially auth endpoints)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

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

// Personal & Family routes (must be before /api/personal and /api/family)
app.use('/api/personal/recurring', recurringRoutes);
app.use('/api/family/recurring', recurringRoutes);

// Маршруты
app.use('/api/wishes', wishRoutes);
app.use('/api/safety-pillow', safetyPillowRoutes);
app.use('/api/auth', authRoutes);
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

// Personal & Family routes use same controllers but filtered by user.family_id
// Frontend switches spaces via URL: /personal/* or /family/*
app.use('/api/personal', dashboardRoutes); // for /personal/dashboard
app.use('/api/family', dashboardRoutes);   // for /family/dashboard

// Global error handler (must be after routes)
app.use(errorHandler);

// Проверка подключения к БД
prisma.$connect()
  .then(() => console.log('✅ Подключение к PostgreSQL (Prisma) успешно!'))
  .catch(err => console.error('❌ Ошибка подключения к PostgreSQL:', err));

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
      console.log(`✅ Recurring job completed: ${result.created} transactions created`);
    } catch (e) {
      jobStatus.recurring.lastError = e.message;
      jobStatus.recurring.status = 'error';
      console.error('❌ Recurring job error:', e);
    }
  });
}

// Monthly interest accrual for goals (runs on 00:00 on the 1st day of every month)
if (process.env.ENABLE_INTEREST_JOB !== 'false') {
  cron.schedule('0 0 1 * *', async () => {
    jobStatus.interest.lastRun = new Date().toISOString();
    jobStatus.interest.status = 'running';
    try {
      const result = await runInterestMonthly();
      jobStatus.interest.lastSuccess = new Date().toISOString();
      jobStatus.interest.status = 'success';
      console.log(`✅ Interest job completed: ${result.processed} goals updated for ${result.month}`);
    } catch (e) {
      jobStatus.interest.lastError = e.message;
      jobStatus.interest.status = 'error';
      console.error('❌ Interest job error:', e);
    }
  });
}

// Monthly SafetyPillowSnapshot (runs on 00:00 on the 1st day of every month)
if (process.env.ENABLE_SNAPSHOT_JOB !== 'false') {
  cron.schedule('0 0 1 * *', async () => {
    jobStatus.snapshot.lastRun = new Date().toISOString();
    jobStatus.snapshot.status = 'running';
    try {
      const result = await runSnapshotMonthly();
      jobStatus.snapshot.lastSuccess = new Date().toISOString();
      jobStatus.snapshot.status = 'success';
      console.log(`✅ Snapshot job completed: ${result.personal} personal, ${result.family} family snapshots created`);
    } catch (e) {
      jobStatus.snapshot.lastError = e.message;
      jobStatus.snapshot.status = 'error';
      console.error('❌ Snapshot job error:', e);
    }
  });
}

// Retry failed jobs every 5 minutes
if (process.env.ENABLE_RETRY_JOB !== 'false') {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const results = await processScheduledJobs();
      if (results.length > 0) {
        console.log(`🔄 Retry job: ${results.length} jobs processed`);
      }
    } catch (e) {
      console.error('❌ Retry job error:', e);
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
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
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', time: new Date().toISOString() });
  }
});

// Prometheus метрики
app.get('/metrics', async (req, res) => {
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
  } catch (error) {
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
  } catch (e) {
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
  console.log(` Сервер запущен на http://localhost:${PORT}`);
  console.log(` WebSocket сервер инициализирован`);
});
