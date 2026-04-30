const prisma = require('../lib/prisma-client');
const { emitNotification } = require('../lib/socket');

async function createNotification(userId, type, title, message, relatedId = null, relatedType = null) {
  try {
    const settings = await prisma.notificationSetting.findFirst({ where: { user_id: userId } });
    if (settings) {
      if (type === 'goal_reached' && !settings.notify_goal_reached) return null;
      if (type === 'wish_completed' && !settings.notify_wish_completed) return null;
      if (type === 'budget_exceeded' && !settings.notify_budget_exceeded) return null;
    }

    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        message,
        related_id: relatedId,
        related_type: relatedType,
      }
    });

    emitNotification(userId, notification);

    return notification;
  } catch (err) {
    console.error('createNotification error:', err);
    return null;
  }
}

async function notifyGoalReached(goal) {
  const user = await prisma.user.findUnique({ where: { id: goal.user_id } });
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

async function notifyWishCompleted(wish) {
  const user = await prisma.user.findUnique({ where: { id: wish.user_id } });
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

async function notifyBudgetExceeded(budget, category, actualAmount) {
  const user = await prisma.user.findUnique({ where: { id: budget.user_id } });
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

async function getUserNotifications(userId, { limit = 20, offset = 0, unreadOnly = false } = {}) {
  const where = { user_id: userId };
  if (unreadOnly) where.read = false;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
  ]);
  return { rows: items, count: total };
}

async function markAsRead(notificationId, userId) {
  const notification = await prisma.notification.findFirst({ where: { id: notificationId, user_id: userId } });
  if (!notification) return false;
  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true }
  });
  return true;
}

async function markAllAsRead(userId) {
  await prisma.notification.updateMany({
    where: { user_id: userId, read: false },
    data: { read: true }
  });
}

async function deleteNotification(notificationId, userId) {
  const notification = await prisma.notification.findFirst({ where: { id: notificationId, user_id: userId } });
  if (!notification) return false;
  await prisma.notification.delete({ where: { id: notificationId } });
  return true;
}

async function getUnreadCount(userId) {
  return await prisma.notification.count({ where: { user_id: userId, read: false } });
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