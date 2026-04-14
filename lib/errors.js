class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Запись не найдена') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Запись уже существует') {
    super(message, 409, 'CONFLICT');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Не авторизован') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Доступ запрещён') {
    super(message, 403, 'FORBIDDEN');
  }
}

function formatError(err) {
  if (err.isOperational) {
    return {
      error: err.code,
      message: err.message,
    };
  }

  if (err.code === 'P2002') {
    return { error: 'CONFLICT', message: 'Запись уже существует' };
  }
  if (err.code === 'P2025') {
    return { error: 'NOT_FOUND', message: 'Запись не найдена' };
  }
  if (err.name === 'PrismaClientKnownRequestError') {
    return { error: 'DATABASE_ERROR', message: 'Ошибка базы данных' };
  }

  return {
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Внутренняя ошибка сервера',
  };
}

const logger = require('./logger');

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  formatError,
  logger,
};