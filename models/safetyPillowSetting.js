const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const SafetyPillowSetting = sequelize.define('SafetyPillowSetting', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
    months: { type: DataTypes.TINYINT.UNSIGNED, defaultValue: 3 },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'safety_pillow_settings',
    timestamps: false,
    underscored: true,
  });

  SafetyPillowSetting.associate = (models) => {
    SafetyPillowSetting.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
  };

  return SafetyPillowSetting;
};