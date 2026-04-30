const {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  TooManyRequestsError,
  formatError,
} = require('../lib/errors');

describe('Error Classes', () => {
  describe('AppError', () => {
    test('создает ошибку с правильными параметрами', () => {
      const error = new AppError('Test error', 500, 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
    });

    test('использует значения по умолчанию', () => {
      const error = new AppError('Test');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('ValidationError', () => {
    test('создает ошибку валидации', () => {
      const error = new ValidationError('Invalid data');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid data');
    });

    test('использует сообщение по умолчанию', () => {
      const error = new ValidationError();
      expect(error.message).toBe('Некорректные данные');
    });
  });

  describe('NotFoundError', () => {
    test('создает ошибку 404', () => {
      const error = new NotFoundError('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    test('использует сообщение по умолчанию', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Запись не найдена');
    });
  });

  describe('ConflictError', () => {
    test('создает ошибку конфликта', () => {
      const error = new ConflictError('Already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('UnauthorizedError', () => {
    test('создает ошибку авторизации', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    test('создает ошибку доступа', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('TooManyRequestsError', () => {
    test('создает ошибку rate limit', () => {
      const error = new TooManyRequestsError();
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('TOO_MANY_REQUESTS');
    });
  });
});

describe('formatError', () => {
  test('возвращает operational ошибки как есть', () => {
    const error = new ValidationError('Invalid');
    const result = formatError(error);
    expect(result.error).toBe('VALIDATION_ERROR');
    expect(result.message).toBe('Invalid');
  });

  test('обрабатывает Prisma P2002 (unique constraint)', () => {
    const error = { code: 'P2002', isOperational: false };
    const result = formatError(error);
    expect(result.error).toBe('CONFLICT');
    expect(result.message).toBe('Запись с такими данными уже существует');
  });

  test('обрабатывает Prisma P2025 (not found)', () => {
    const error = { code: 'P2025', isOperational: false };
    const result = formatError(error);
    expect(result.error).toBe('NOT_FOUND');
    expect(result.message).toBe('Запись не найдена');
  });

  test('обрабатывает JsonWebTokenError', () => {
    const error = { name: 'JsonWebTokenError', message: 'invalid token', isOperational: false };
    const result = formatError(error);
    expect(result.error).toBe('UNAUTHORIZED');
    expect(result.message).toBe('Недействительный токен');
  });

  test('обрабатывает TokenExpiredError', () => {
    const error = { name: 'TokenExpiredError', message: 'jwt expired', isOperational: false };
    const result = formatError(error);
    expect(result.error).toBe('UNAUTHORIZED');
    expect(result.message).toBe('Сессия истекла. Войдите снова.');
  });

  test('скрывает детали в production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const error = { message: 'secret error', isOperational: false };
    const result = formatError(error);
    expect(result.error).toBe('INTERNAL_ERROR');
    expect(result.message).not.toContain('secret');
    process.env.NODE_ENV = originalEnv;
  });
});
