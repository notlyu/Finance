/**
 * scopeMiddleware — определяет req.scope из URL-префикса.
 * Маршруты /api/personal/* → scope = 'personal'
 * Маршруты /api/family/*   → scope = 'family'
 * Остальные маршруты       → scope определяется по req.user.family_id
 */
module.exports = (req, res, next) => {
  const url = req.originalUrl || req.url || '';

  if (url.startsWith('/api/personal/') || url === '/api/personal') {
    req.scope = 'personal';
  } else if (url.startsWith('/api/family/') || url === '/api/family') {
    req.scope = 'family';
  } else {
    // Для старых маршрутов /api/transactions и пр. — определяем по query/body
    req.scope = req.query?.scope || req.body?.scope || null;
  }

  next();
};
