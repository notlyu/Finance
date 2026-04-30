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
  constructor(message = 'Некорректные данные') {
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

class TooManyRequestsError extends AppError {
  constructor(message = 'Слишком много запросов') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

const errorTranslations = {
  // PostgreSQL/Prisma ошибки
  'P2002': 'Запись с такими данными уже существует',
  'P2003': 'Связанная запись не найдена',
  'P2025': 'Запись не найдена',
  'P2014': 'Нарушение связи между записями',
  'P2015': 'Ошибка связи - запись не существует',
  'P2016': 'Ошибка проверки данных',
  'P2017': 'Зависимая запись всё ещё существует',
  'P2018': 'Не хватает требуемых данных',
  'P2019': 'Некорректное значение поля',
  'P2020': 'Значение выходит за допустимые пределы',
  'P2021': 'Таблица не найдена',
  'P2022': 'Колонка не найдена',
  'P2023': 'Ошибка данных - нарушение ограничений',

  // Системные ошибки Node.js
  'ECONNREFUSED': 'Не удалось подключиться к серверу. Попробуйте позже.',
  'ETIMEDOUT': 'Время ожидания истекло. Проверьте подключение к интернету.',
  'ENOTFOUND': 'Сервер не найден. Проверьте адрес.',
  'ECONNRESET': 'Соединение было сброшено. Попробуйте ещё раз.',
  'EAI_AGAIN': 'Временно недоступно. Попробуйте позже.',
  'EPERM': 'Доступ запрещён. У вас нет прав для этого действия.',
  'EACCES': 'Нет доступа. Проверьте разрешения.',

  // Валидация
  'VALUE_OUT_OF_RANGE': 'Значение выходит за допустимые пределы',
  'INVALID_VALUE': 'Некорректное значение',
  'REQUIRED_FIELD': 'Это поле обязательно для заполнения',
  'INVALID_FORMAT': 'Неверный формат данных',
  'TOO_LARGE': 'Слишком большое значение',
  'TOO_SMALL': 'Слишком маленькое значение',

  // Прочие ошибки
  'JsonWebTokenError': 'Сессия недействительна. Войдите снова.',
  'TokenExpiredError': 'Сессия истекла. Войдите снова.',
  'SequelizeUniqueConstraintError': 'Такое значение уже существует',
  'SequelizeValidationError': 'Ошибка проверки данных',
  'MongoError': 'Ошибка базы данных. Поп��обуйте позже.',
  'MulterError': 'Ошибка при загрузке файла',
};

function formatError(err) {
  // Операционные ошибки (наши собственные)
  if (err.isOperational) {
    return {
      error: err.code,
      message: err.message,
    };
  }

  // Prisma ошибки
  const prismaErrorCode = err.code;
  if (prismaErrorCode && errorTranslations[prismaErrorCode]) {
    return { error: 'DATABASE_ERROR', message: errorTranslations[prismaErrorCode] };
  }

  // Ошибки Node.js и системные
  if (err.code && errorTranslations[err.code]) {
    return { error: 'SYSTEM_ERROR', message: errorTranslations[err.code] };
  }

  // Именованные ошибки
  if (err.name === 'PrismaClientKnownRequestError') {
    return { error: 'DATABASE_ERROR', message: 'Ошибка базы данных. Попробуйте позже.' };
  }
  if (err.name === 'PrismaClientInitializationError') {
    return { error: 'INIT_ERROR', message: 'Ошибка инициализации. Перезапустите приложение.' };
  }
  if (err.name === 'PrismaClientKnownRequestError') {
    return { error: 'DATABASE_ERROR', message: 'Ошибка базы данных. Попробуйте позже.' };
  }
  if (err.name === 'JsonWebTokenError') {
    return { error: 'UNAUTHORIZED', message: 'Сессия недействительна. Войдите снова.' };
  }
  if (err.name === 'TokenExpiredError') {
    return { error: 'UNAUTHORIZED', message: 'Сессия истекла. Войдите снова.' };
  }
  if (err.name === 'ValidationError') {
    return { error: 'VALIDATION_ERROR', message: errorTranslations.VALIDATION_ERROR || 'Некорректные данные' };
  }
  if (err.name === 'MulterError') {
    return { error: 'UPLOAD_ERROR', message: errorTranslations.MulterError || 'Ошибка при загрузке файла' };
  }

  // Проверяем сообщение об ошибке на наличие ключевых слов
  const errMessage = err.message || '';
  if (errMessage.includes('numeric field overflow')) {
    return { error: 'VALUE_ERROR', message: 'Слишком большое число. Введите меньшее значение.' };
  }
  if (errMessage.includes('out of range')) {
    return { error: 'VALUE_ERROR', message: 'Значение выходит за допустимые пределы.' };
  }
  if (errMessage.includes('unique constraint')) {
    return { error: 'CONFLICT', message: 'Такое значение уже существует' };
  }
  if (errMessage.includes('not found')) {
    return { error: 'NOT_FOUND', message: 'Запись не найдена' };
  }
  if (errMessage.includes('permission') || errMessage.includes('denied')) {
    return { error: 'FORBIDDEN', message: 'Доступ запрещён' };
  }
  if (errMessage.includes('auth') || errMessage.includes('token')) {
    return { error: 'UNAUTHORIZED', message: 'Требуется авторизация' };
  }

  // По умолчанию
  return {
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Что-то пошло не так. Попробуйте ещё раз или обновите страницу.',
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
  TooManyRequestsError,
  formatError,
  logger,
};