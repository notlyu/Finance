const DEBUG = process.env.REACT_APP_DEBUG === 'true';

const logger = {
  debug: (...args) => { if (DEBUG) console.debug('[DEBUG]', ...args); },
  info: (...args) => { if (DEBUG) console.info('[INFO]', ...args); },
  warn: (...args) => { if (DEBUG) console.warn('[WARN]', ...args); },
  error: (...args) => { if (DEBUG) console.error('[ERROR]', ...args); },
  force: {
    error: (...args) => console.error(...args),
    warn: (...args) => console.warn(...args),
  },
};

export default logger;