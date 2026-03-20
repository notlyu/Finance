const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const SafetyPillowHistory = sequelize.define('SafetyPillowHistory', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    value: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    target_value: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    calculated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'safety_pillow_history',
    timestamps: false,
    underscored: true,
  });

  SafetyPillowHistory.associate = (models) => {
    SafetyPillowHistory.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
  };

  return SafetyPillowHistory;
};