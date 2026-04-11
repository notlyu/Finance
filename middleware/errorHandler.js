module.exports = (err, req, res, next) => {
  console.error(err.stack);

  // Ошибки валидации
  if (err.name === 'ValidationError' || err.isOperational) {
    return res.status(400).json({ message: err.message });
  }

  // Prisma и Sequelize ошибки БД (например, уникальные индексы)
  if (err.name === 'SequelizeUniqueConstraintError' || err?.code === 'P2002') {
    return res.status(409).json({ message: 'Запись уже существует' });
  }
  if (err?.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Запись не найдена' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Запись уже существует' });
    }
    return res.status(400).json({ message: err.message });
  }

  // Остальное - серверная ошибка
  res.status(500).json({ 
    message: 'Внутренняя ошибка сервера',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
};
