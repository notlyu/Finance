const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const GoalContribution = sequelize.define('GoalContribution', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    goal_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    transaction_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'goal_contributions',
    timestamps: false,
    underscored: true,
  });

  GoalContribution.associate = (models) => {
    GoalContribution.belongsTo(models.Goal, { foreignKey: 'goal_id', as: 'Goal' });
    GoalContribution.belongsTo(models.Transaction, { foreignKey: 'transaction_id', as: 'Transaction' });
  };

  return GoalContribution;
};