const { emitFamilyUpdate } = require('./socket');
const { logger } = require('./errors');

// #9: уведомляем остальных участников семьи об изменении ОБЩИХ данных (realtime).
// Вызывать только для семейного scope — личные данные приватны (партнёр не должен
// получать realtime-сигнал о личной операции).
function notifyFamily(req, resource) {
  if (!req.user?.family_id) return;
  try {
    emitFamilyUpdate(req.user.family_id, 'family_update', { resource, by: req.user.id }, req.user.id);
  } catch (e) {
    logger.warn({ err: e }, 'family_update emit failed');
  }
}

module.exports = { notifyFamily };
