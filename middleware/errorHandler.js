module.exports = (err, req, res, next) => {
  console.error(err.stack);

  // Ошибки валидации
  if (err.name === 'ValidationError' || err.isOperational) {
    return res.status(400).json({ message: err.message });
  }

  // Ошибки БД (например, уникальные индексы)
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'Запись уже существует' });
  }

  // Остальное - серверная ошибка
  res.status(500).json({ 
    message: 'Внутренняя ошибка сервера',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
};