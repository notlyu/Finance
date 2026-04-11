let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  Sentry = null;
}

const SENTRY_DSN = process.env.SENTRY_DSN;

function initSentry(app) {
  if (Sentry && SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: [],
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
    Sentry.setupExpressErrorHandler(app);
  }
}

function captureError(error, extra = {}) {
  if (Sentry && SENTRY_DSN) {
    Sentry.captureException(error, { extra });
  }
}

module.exports = {
  initSentry,
  captureError,
  Sentry,
};