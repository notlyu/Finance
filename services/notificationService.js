const { Notification, NotificationSetting, Goal, Wish, Budget, Transaction, User } = require('../models');
const { Op } = require('sequelize');

// Создать уведомление для пользователя
async function createNotification(userId, type, title, message, relatedId = null, relatedType = null) {
  try {
    // Проверить настройки уведомлений
    const settings = await NotificationSetting.findOne({ where: { user_id: userId } });
    if (settings) {
      if (type === 'goal_reached' && !settings.notify_goal_reached) return null;
      if (type === 'wish_completed' && !settings.notify_wish_completed) return null;
      if (type === 'budget_exceeded' && !settings.notify_budget_exceeded) return null;
    }

    return await Notification.create({
      user_id: userId,
      type,
      title,
      message,
      related_id: relatedId,
      related_type: relatedType,
    });
  } catch (err) {
    console.error('createNotification error:', err);
    return null;
  }
}

// Уведомление о достижении цели
async function notifyGoalReached(goal) {
  const user = await User.findByPk(goal.user_id);
  if (!user) return;

  await createNotification(
    user.id,
    'goal_reached',
    '🎉 Цель достигнута!',
    `Поздравляем! Вы накопили на цель "${goal.name}" — ${goal.current_amount} ₽ из ${goal.target_amount} ₽`,
    goal.id,
    'goal'
  );
}

// Уведомление о выполнении желания
async function notifyWishCompleted(wish) {
  const user = await User.findByPk(wish.user_id);
  if (!user) return;

  await createNotification(
    user.id,
    'wish_completed',
    '✨ Желание выполнено!',
    `Вы накопили на "${wish.name}" — ${wish.saved_amount} ₽ из ${wish.cost} ₽`,
    wish.id,
    'wish'
  );
}

// Уведомление о превышении бюджета
async function notifyBudgetExceeded(budget, category, actualAmount) {
  const user = await User.findByPk(budget.user_id);
  if (!user) return;

  await createNotification(
    user.id,
    'budget_exceeded',
    '⚠️ Бюджет превышен',
    `Расходы по категории "${category.name}" (${actualAmount} ₽) превысили бюджет (${budget.limit_amount} ₽)`,
    budget.id,
    'budget'
  );
}

// Уведомление о предстоящих регулярных операциях
async function notifyUpcomingRecurring(userId, recurringOps) {
  if (!recurringOps || recurringOps.length === 0) return;

  await createNotification(
    userId,
    'recurring_created',
    '📅 Предстоящие платежи',
    `У вас ${recurringOps.length} регулярных операций в ближайшие дни`,
    null,
    'recurring'
  );
}

// Получить все уведомления пользователя
async function getUserNotifications(userId, { limit = 20, offset = 0, unreadOnly = false } = {}) {
  const where = { user_id: userId };
  if (unreadOnly) where.is_read = false;

  return await Notification.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });
}

// Пометить уведомление как прочитанное
async function markAsRead(notificationId, userId) {
  const notification = await Notification.findOne({ where: { id: notificationId, user_id: userId } });
  if (!notification) return false;
  await notification.update({ is_read: true });
  return true;
}

// Пометить все уведомления как прочитанные
async function markAllAsRead(userId) {
  await Notification.update({ is_read: true }, { where: { user_id: userId, is_read: false } });
}

// Удалить уведомление
async function deleteNotification(notificationId, userId) {
  const notification = await Notification.findOne({ where: { id: notificationId, user_id: userId } });
  if (!notification) return false;
  await notification.destroy();
  return true;
}

// Получить количество непрочитанных
async function getUnreadCount(userId) {
  return await Notification.count({ where: { user_id: userId, is_read: false } });
}

module.exports = {
  createNotification,
  notifyGoalReached,
  notifyWishCompleted,
  notifyBudgetExceeded,
  notifyUpcomingRecurring,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
};
