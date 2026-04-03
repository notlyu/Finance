const { Notification } = require('../models');

// Get or create notification settings for current user
exports.getSettings = async (req, res) => {
  try {
    const user = req.user;
    let setting = await Notification.findOne({ where: { user_id: user.id } });
    if (!setting) {
      setting = await Notification.create({ user_id: user.id });
    }
    res.json(setting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const user = req.user;
    const { remind_upcoming, notify_goal_reached, notify_budget_exceeded } = req.body || {};
    let setting = await Notification.findOne({ where: { user_id: user.id } });
    if (!setting) {
      setting = await Notification.create({ user_id: user.id });
    }
    if (typeof remind_upcoming !== 'undefined') setting.remind_upcoming = !!remind_upcoming;
    if (typeof notify_goal_reached !== 'undefined') setting.notify_goal_reached = !!notify_goal_reached;
    if (typeof notify_budget_exceeded !== 'undefined') setting.notify_budget_exceeded = !!notify_budget_exceeded;
    await setting.save();
    res.json(setting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
