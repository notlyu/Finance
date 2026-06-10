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
  'MulterError': 'Ошибка при загрузке файла',
};

function formatError(err) {
  const base = { side: 'backend' };

  // Операционные ошибки (наши собственные)
  if (err.isOperational) {
    return {
      ...base,
      error: err.code,
      message: err.message,
    };
  }

  // Prisma ошибки
  const prismaErrorCode = err.code;
  if (prismaErrorCode && errorTranslations[prismaErrorCode]) {
    // Маппинг Prisma-кодов на HTTP-статусы
    const prismaStatus = {
      P2002: 409, // unique constraint
      P2003: 400, // foreign key constraint (например, несуществующий category_id)
      P2025: 404, // запись не найдена
      P2014: 400,
    };
    const statusCode = prismaStatus[prismaErrorCode];
    return {
      ...base,
      error: 'DATABASE_ERROR',
      message: errorTranslations[prismaErrorCode],
      ...(statusCode ? { statusCode } : {}),
    };
  }

  // Ошибки Node.js и системные
  if (err.code && errorTranslations[err.code]) {
    return { ...base, error: 'SYSTEM_ERROR', message: errorTranslations[err.code] };
  }

  // Именованные ошибки
  if (err.name === 'PrismaClientKnownRequestError') {
    return { ...base, error: 'DATABASE_ERROR', message: 'Ошибка базы данных. Попробуйте позже.' };
  }
  if (err.name === 'PrismaClientInitializationError') {
    return { ...base, error: 'INIT_ERROR', message: 'Ошибка инициализации. Перезапустите приложение.' };
  }
  if (err.name === 'JsonWebTokenError') {
    return { ...base, error: 'UNAUTHORIZED', message: 'Сессия недействительна. Войдите снова.' };
  }
  if (err.name === 'TokenExpiredError') {
    return { ...base, error: 'UNAUTHORIZED', message: 'Сессия истекла. Войдите снова.' };
  }
  if (err.name === 'ValidationError') {
    return { ...base, error: 'VALIDATION_ERROR', message: errorTranslations.VALIDATION_ERROR || 'Некорректные данные' };
  }
  if (err.name === 'MulterError') {
    return { ...base, error: 'UPLOAD_ERROR', message: errorTranslations.MulterError || 'Ошибка при загрузке файла' };
  }

  // Проверяем сообщение об ошибке на наличие ключевых слов
  const errMessage = err.message || '';
  if (errMessage.includes('numeric field overflow')) {
    return { ...base, error: 'VALUE_ERROR', message: 'Слишком большое число. Введите меньшее значение.' };
  }
  if (errMessage.includes('out of range')) {
    return { ...base, error: 'VALUE_ERROR', message: 'Значение выходит за допустимые пределы.' };
  }
  if (errMessage.includes('unique constraint')) {
    return { ...base, error: 'CONFLICT', message: 'Такое значение уже существует' };
  }
  if (errMessage.includes('not found')) {
    return { ...base, error: 'NOT_FOUND', message: 'Запись не найдена' };
  }
  if (errMessage.includes('permission') || errMessage.includes('denied')) {
    return { ...base, error: 'FORBIDDEN', message: 'Доступ запрещён' };
  }
  if (errMessage.includes('auth') || errMessage.includes('token')) {
    return { ...base, error: 'UNAUTHORIZED', message: 'Требуется авторизация' };
  }

  // По умолчанию
  const result = {
    ...base,
    error: 'INTERNAL_ERROR',
    message: 'Что-то пошло не так. Попробуйте ещё раз или обновите страницу.',
  };

  if (process.env.NODE_ENV === 'development') {
    result.message = err.message;
    result.details = err.stack || err.message;
  }

  return result;
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