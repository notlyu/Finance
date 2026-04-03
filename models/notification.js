const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: false },
    remind_upcoming: { type: DataTypes.BOOLEAN, defaultValue: true },
    notify_goal_reached: { type: DataTypes.BOOLEAN, defaultValue: true },
    notify_budget_exceeded: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'notifications',
    timestamps: false,
    underscored: true,
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
  };

  return Notification;
};
