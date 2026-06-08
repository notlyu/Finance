// testApp.js - Express app without listening (for Supertest)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('../routes/authRoutes');
const transactionRoutes = require('../routes/transactionRoutes');
const goalRoutes = require('../routes/goalRoutes');
const wishRoutes = require('../routes/wishRoutes');
const safetyPillowRoutes = require('../routes/safetyPillowRoutes');
const categoryRoutes = require('../routes/categoryRoutes');
const reportRoutes = require('../routes/reportRoutes');
const budgetRoutes = require('../routes/budgetRoutes');
const recurringRoutes = require('../routes/recurringRoutes');
const notificationRoutes = require('../routes/notificationRoutes');
const dashboardRoutes = require('../routes/dashboardRoutes');
const accountRoutes = require('../routes/accountRoutes');
const debtRoutes = require('../routes/debtRoutes');
const importRoutes = require('../routes/importRoutes');
const exportRoutes = require('../routes/exportRoutes');
const widgetRoutes = require('../routes/widgetRoutes');
const familySettingsRoutes = require('../routes/familySettingsRoutes');
const auditRoutes = require('../routes/auditRoutes');

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/wishes', wishRoutes);
app.use('/api/safety-pillow', safetyPillowRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/import', importRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/widget-config', widgetRoutes);
app.use('/api/family-settings', familySettingsRoutes);
app.use('/api/audit', auditRoutes);

// Inline routes (health, metrics, root)
app.get('/', (req, res) => res.send('Server works!'));
app.get('/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/health/detailed', async (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});
app.get('/health/jobs', (req, res) => {
  res.json({ recurring: { status: 'idle' } });
});
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# Test metrics\n');
});

// Error handler
const errorHandler = require('../middleware/errorHandler');
app.use(errorHandler);

module.exports = app;
