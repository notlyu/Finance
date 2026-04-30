'use strict';

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const pool = new Pool({
  connectionString,
  max: isTest ? 2 : (isProduction ? 20 : 10),
  min: isTest ? 0 : (isProduction ? 5 : 2),
  idleTimeoutMillis: isProduction ? 30000 : 10000,
  connectionTimeoutMillis: isProduction ? 5000 : 5000,
  allowExitOnIdle: false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  if (process.env.SENTRY_DSN) {
    const Sentry = require('@sentry/node');
    Sentry.captureException(err);
  }
});

pool.on('connect', () => {
  console.log('New client connected to PostgreSQL');
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ 
  adapter,
  log: isProduction 
    ? ['error', 'warn'] 
    : ['query', 'info', 'warn', 'error'],
});

if (!isTest) {
  prisma.$connect().then(() => {
    console.log('Prisma connected to PostgreSQL');
  }).catch((err) => {
    console.error('Failed to connect to PostgreSQL:', err);
  });
}

module.exports = prisma;
