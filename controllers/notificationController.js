const { Notification, NotificationSetting } = require('../lib/models');
const notifService = require('../services/notificationService');

// Получить настройки уведомлений
exports.getSettings = async (req, res) => {
  try {
    const user = req.user;
    let settings = await NotificationSetting.findOne({ where: { user_id: user.id } });
    if (!settings) {
      settings = await NotificationSetting.create({ user_id: user.id });
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Обновить настройки уведомлений
exports.updateSettings = async (req, res) => {
  try {
    const user = req.user;
    let settings = await NotificationSetting.findOne({ where: { user_id: user.id } });
    if (!settings) {
      settings = await NotificationSetting.create({ user_id: user.id });
    }

    const { remind_upcoming, notify_goal_reached, notify_budget_exceeded, notify_wish_completed } = req.body;
    if (typeof remind_upcoming === 'boolean') settings.remind_upcoming = remind_upcoming;
    if (typeof notify_goal_reached === 'boolean') settings.notify_goal_reached = notify_goal_reached;
    if (typeof notify_budget_exceeded === 'boolean') settings.notify_budget_exceeded = notify_budget_exceeded;
    if (typeof notify_wish_completed === 'boolean') settings.notify_wish_completed = notify_wish_completed;

    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получить уведомления пользователя
exports.getNotifications = async (req, res) => {
  try {
    const user = req.user;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const { count, rows } = await notifService.getUserNotifications(user.id, { limit, offset, unreadOnly });

    res.json({
      total: count,
      notifications: rows,
      hasMore: offset + rows.length < count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Количество непрочитанных
exports.getUnreadCount = async (req, res) => {
  try {
    const user = req.user;
    const count = await notifService.getUnreadCount(user.id);
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Пометить как прочитанное
exports.markAsRead = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const success = await notifService.markAsRead(id, user.id);
    if (!success) return res.status(404).json({ message: 'Уведомление не найдено' });
    res.json({ message: 'Отмечено как прочитанное' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Пометить все как прочитанное
exports.markAllAsRead = async (req, res) => {
  try {
    const user = req.user;
    await notifService.markAllAsRead(user.id);
    res.json({ message: 'Все уведомления отмечены как прочитанные' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Удалить уведомление
exports.deleteNotification = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const success = await notifService.deleteNotification(id, user.id);
    if (!success) return res.status(404).json({ message: 'Уведомление не найдено' });
    res.json({ message: 'Уведомление удалено' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
