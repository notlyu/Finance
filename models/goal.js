const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Goal = sequelize.define('Goal', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    family_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    target_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    target_date: { type: DataTypes.DATEONLY, allowNull: true },
    interest_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    current_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
    // Archiving and completion state
    archived: { type: DataTypes.BOOLEAN, defaultValue: false },
    archived_at: { type: DataTypes.DATE, allowNull: true },
    auto_contribute_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    auto_contribute_type: { type: DataTypes.ENUM('percentage', 'fixed'), allowNull: true },
    auto_contribute_value: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'goals',
    timestamps: false,
    underscored: true,
  });

  Goal.associate = (models) => {
    Goal.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
    Goal.belongsTo(models.Family, { foreignKey: 'family_id', as: 'Family' });
    Goal.hasMany(models.GoalContribution, { foreignKey: 'goal_id', as: 'Contributions' });
  };

  return Goal;
};
