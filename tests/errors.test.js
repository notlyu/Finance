const {
  AppError, ValidationError, NotFoundError, ConflictError,
  UnauthorizedError, ForbiddenError, TooManyRequestsError, formatError,
} = require('../lib/errors');

describe('Error Classes', () => {
  test('AppError creates error with correct params', () => {
    const error = new AppError('Test error', 500, 'TEST_ERROR');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.isOperational).toBe(true);
  });
  test('AppError default values', () => {
    const error = new AppError('Test');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
  });
  test('ValidationError', () => {
    const error = new ValidationError('Invalid');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });
  test('NotFoundError', () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Запись не найдена');
  });
  test('ConflictError', () => {
    const error = new ConflictError('Exists');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });
  test('UnauthorizedError', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });
  test('ForbiddenError', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
  test('TooManyRequestsError', () => {
    const error = new TooManyRequestsError();
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('TOO_MANY_REQUESTS');
  });
});

describe('formatError', () => {
  test('operational errors pass through', () => {
    const error = new ValidationError('Invalid');
    const result = formatError(error);
    expect(result.side).toBe('backend');
    expect(result.error).toBe('VALIDATION_ERROR');
    expect(result.message).toBe('Invalid');
  });

  test('adds side: backend to all responses', () => {
    const error = new NotFoundError('Not found');
    const result = formatError(error);
    expect(result.side).toBe('backend');
  });

  test('Prisma P2002 (unique constraint)', () => {
    const error = { code: 'P2002', isOperational: false };
    const result = formatError(error);
    expect(result.side).toBe('backend');
    expect(result.error).toBe('DATABASE_ERROR');
    expect(result.message).toBe('Запись с такими данными уже существует');
  });

  test('Prisma P2025 (not found)', () => {
    const error = { code: 'P2025', isOperational: false };
    const result = formatError(error);
    expect(result.error).toBe('DATABASE_ERROR');
    expect(result.message).toBe('Запись не найдена');
  });

  test('JsonWebTokenError', () => {
    const error = { name: 'JsonWebTokenError', message: 'invalid', isOperational: false };
    const result = formatError(error);
    expect(result.side).toBe('backend');
    expect(result.error).toBe('UNAUTHORIZED');
  });

  test('TokenExpiredError', () => {
    const error = { name: 'TokenExpiredError', message: 'expired', isOperational: false };
    const result = formatError(error);
    expect(result.error).toBe('UNAUTHORIZED');
    expect(result.message).toBe('Сессия истекла. Войдите снова.');
  });

  test('hides details in production', () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const error = { message: 'secret error', isOperational: false };
    const result = formatError(error);
    expect(result.side).toBe('backend');
    expect(result.error).toBe('INTERNAL_ERROR');
    expect(result.message).not.toContain('secret');
    expect(result.details).toBeUndefined();
    process.env.NODE_ENV = orig;
  });

  test('shows details in development', () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const error = { message: 'dev error', stack: 'line1\nline2', isOperational: false };
    const result = formatError(error);
    expect(result.side).toBe('backend');
    expect(result.message).toBe('dev error');
    expect(result.details).toBe('line1\nline2');
    process.env.NODE_ENV = orig;
  });

  test('handles MulterError', () => {
    const error = { name: 'MulterError', message: 'File too large', isOperational: false };
    const result = formatError(error);
    expect(result.side).toBe('backend');
    expect(result.error).toBe('UPLOAD_ERROR');
  });

  test('keyword-based error detection: numeric field overflow', () => {
    const error = { message: 'numeric field overflow', isOperational: false };
    const result = formatError(error);
    expect(result.error).toBe('VALUE_ERROR');
  });

  test('keyword-based: unique constraint', () => {
    const error = { message: 'unique constraint violation', isOperational: false };
    const result = formatError(error);
    expect(result.error).toBe('CONFLICT');
  });

  test('keyword-based: not found', () => {
    const error = { message: 'record not found', isOperational: false };
    const result = formatError(error);
    expect(result.error).toBe('NOT_FOUND');
  });

  test('keyword-based: permission denied', () => {
    const error = { message: 'permission denied', isOperational: false };
    const result = formatError(error);
    expect(result.error).toBe('FORBIDDEN');
  });

  test('keyword-based: auth/token', () => {
    const error = { message: 'invalid auth token', isOperational: false };
    const result = formatError(error);
    expect(result.error).toBe('UNAUTHORIZED');
  });
});
