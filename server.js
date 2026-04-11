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

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(` Сервер запущен на http://localhost:${PORT}`);
});
