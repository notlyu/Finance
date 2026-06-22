const prisma = require('../lib/prisma-client');

const RETRY_DELAYS = [5, 30, 60, 300];

exports.scheduleFailedJob = async (jobType, payload, error, maxAttempts = 3) => {
  const attempts = 0;
  const nextRetryAt = new Date(Date.now() + RETRY_DELAYS[0] * 60 * 1000);

  return prisma.failedJob.create({
    data: {
      job_type: jobType,
      payload,
      error: error.message || String(error),
      attempts,
      max_attempts: maxAttempts,
      next_retry_at: nextRetryAt,
    },
  });
};

exports.processScheduledJobs = async () => {
  const pendingJobs = await prisma.failedJob.findMany({
    where: {
      completed: false,
      next_retry_at: { lte: new Date() },
    },
    orderBy: { next_retry_at: 'asc' },
    take: 50,
  });

  const results = [];

  for (const job of pendingJobs) {
    try {
      const handler = require(`../jobs/${job.job_type}Job`);
      const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
      
      await handler(payload);
      
      await prisma.failedJob.update({
        where: { id: job.id },
        data: { completed: true },
      });
      
      results.push({ id: job.id, status: 'completed' });
    } catch (error) {
      const newAttempts = job.attempts + 1;
      
      if (newAttempts >= job.max_attempts) {
        await prisma.failedJob.update({
          where: { id: job.id },
          data: {
            attempts: newAttempts,
            error: (error.message || String(error)) + ` [FAILED after ${newAttempts} attempts]`,
          },
        });
      } else {
        const retryDelay = RETRY_DELAYS[Math.min(newAttempts, RETRY_DELAYS.length - 1)];
        const nextRetryAt = new Date(Date.now() + retryDelay * 60 * 1000);
        
        await prisma.failedJob.update({
          where: { id: job.id },
          data: {
            attempts: newAttempts,
            last_attempt_at: new Date(),
            next_retry_at: nextRetryAt,
            error: error.message || String(error),
          },
        });
      }
      
      results.push({ id: job.id, status: 'retry_scheduled', attempts: newAttempts });
    }
  }

  return results;
};

exports.getFailedJobs = async (filters = {}) => {
  return prisma.failedJob.findMany({
    where: filters,
    orderBy: { created_at: 'desc' },
    take: 100,
  });
};

exports.retryJob = async (jobId) => {
  return prisma.failedJob.update({
    where: { id: jobId },
    data: {
      attempts: 0,
      next_retry_at: new Date(),
      error: 'Manually retried',
    },
  });
};

exports.cancelJob = async (jobId) => {
  return prisma.failedJob.update({
    where: { id: jobId },
    data: {
      completed: true,
      error: 'Manually cancelled',
    },
  });
};