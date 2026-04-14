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

module.exports = app;
