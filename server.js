require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma');
const errorHandler = require('./middleware/errorHandler');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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
const cron = require('node-cron');
const { runRecurringOnce } = require('./jobs/recurringJob');
const { runInterestMonthly } = require('./jobs/interestJob');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.disable('x-powered-by');
app.use(helmet());

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true,
  credentials: process.env.CORS_CREDENTIALS === 'true',
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
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// Global error handler (must be after routes)
app.use(errorHandler);

// Проверка подключения к БД
prisma.$connect()
  .then(() => console.log('✅ Подключение к PostgreSQL (Prisma) успешно!'))
  .catch(err => console.error('❌ Ошибка подключения к PostgreSQL:', err));

// Daily recurring transactions job (03:05 server time)
if (process.env.ENABLE_RECURRING_JOB !== 'false') {
  cron.schedule('5 3 * * *', async () => {
    try {
      await runRecurringOnce();
    } catch (e) {
      console.error('Recurring job error:', e);
    }
  });
}

// Monthly interest accrual for goals (runs on 00:00 on the 1st day of every month)
if (process.env.ENABLE_INTEREST_JOB !== 'false') {
  cron.schedule('0 0 1 * *', async () => {
    try {
      await runInterestMonthly();
    } catch (e) {
      console.error('Interest job error:', e);
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

app.listen(PORT, () => {
  console.log(` Сервер запущен на http://localhost:${PORT}`);
});
