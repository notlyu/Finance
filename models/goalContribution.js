const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const GoalContribution = sequelize.define('GoalContribution', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    goal_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    transaction_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // Type of contribution: normal contribution or interest accrual
    type: { type: DataTypes.ENUM('contribution', 'interest'), defaultValue: 'contribution' },
    // Auto-generated contribution source transaction (for automatic contributions)
    source_transaction_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // Indicates that this contribution was generated automatically
    automatic: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'goal_contributions',
    timestamps: false,
    underscored: true,
  });

  GoalContribution.associate = (models) => {
    GoalContribution.belongsTo(models.Goal, { foreignKey: 'goal_id', as: 'Goal' });
    GoalContribution.belongsTo(models.Transaction, { foreignKey: 'transaction_id', as: 'Transaction' });
    // Link to the source income transaction if this contribution was auto-generated
    GoalContribution.belongsTo(models.Transaction, { foreignKey: 'source_transaction_id', as: 'SourceTransaction' });
  };

  return GoalContribution;
};
