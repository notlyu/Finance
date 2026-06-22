jest.unmock('./logger');

import logger from './logger';

describe('logger', () => {
  it('is defined and has required methods', () => {
    expect(logger).toBeDefined();
    expect(typeof logger).toBe('object');
  });

  it.each(['debug', 'info', 'warn', 'error'])('has %s method', (method) => {
    expect(logger[method]).toBeDefined();
    expect(typeof logger[method]).toBe('function');
  });

  it('has force object with error and warn methods', () => {
    expect(logger.force).toBeDefined();
    expect(typeof logger.force.error).toBe('function');
    expect(typeof logger.force.warn).toBe('function');
  });
});
