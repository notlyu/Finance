const prisma = require('../lib/prisma-client');
const notifService = require('../services/notificationService');
const { logger } = require('../lib/errors');

exports.getSettings = async (req, res, next) => {
  try {
    const user = req.user;
    let settings = await prisma.notificationSetting.findFirst({ where: { user_id: user.id } });
    if (!settings) {
      settings = await prisma.notificationSetting.create({ data: { user_id: user.id } });
    }
    logger.info(`User ${user.id} got notification settings`);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const user = req.user;
    let settings = await prisma.notificationSetting.findFirst({ where: { user_id: user.id } });
    if (!settings) {
      settings = await prisma.notificationSetting.create({ data: { user_id: user.id } });
    }

    const { remind_upcoming, notify_goal_reached, notify_budget_exceeded, notify_wish_completed } = req.body;
    const updateData = {};

    if (remind_upcoming !== undefined) updateData.remind_upcoming = !!remind_upcoming;
    if (notify_goal_reached !== undefined) updateData.notify_goal_reached = !!notify_goal_reached;
    if (notify_budget_exceeded !== undefined) updateData.notify_budget_exceeded = !!notify_budget_exceeded;
    if (notify_wish_completed !== undefined) updateData.notify_wish_completed = !!notify_wish_completed;

    const updated = await prisma.notificationSetting.update({
      where: { id: settings.id },
      data: updateData,
    });
    logger.info(`User ${user.id} updated notification settings`);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const user = req.user;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notifService.getUserNotifications(user.id, { limit, offset, unreadOnly });
    logger.info(`User ${user.id} got notifications`);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const success = await notifService.markAsRead(Number(id), user.id);
    logger.info(`User ${user.id} marked notification ${id} as read`);
    res.json({ success });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const user = req.user;
    await notifService.markAllAsRead(user.id);
    logger.info(`User ${user.id} marked all notifications as read`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const success = await notifService.deleteNotification(Number(id), user.id);
    logger.info(`User ${user.id} deleted notification ${id}`);
    res.json({ success });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const user = req.user;
    const count = await notifService.getUnreadCount(user.id);
    logger.info(`User ${user.id} got unread notification count: ${count}`);
    res.json({ count });
  } catch (error) {
    next(error);
  }
};