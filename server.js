require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
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

// Global error handler (must be after routes)
app.use(errorHandler);

// Проверка подключения к БД
sequelize.authenticate()
  .then(() => console.log(' Подключение к MySQL успешно!'))
  .catch(err => console.error(' Ошибка подключения к MySQL:', err));

// Тестовый маршрут
app.get('/', (req, res) => {
  res.send('Сервер работает!');
});

app.listen(PORT, () => {
  console.log(` Сервер запущен на http://localhost:${PORT}`);
});