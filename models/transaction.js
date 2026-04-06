const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    family_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    type: { type: DataTypes.ENUM('income', 'expense'), allowNull: false },
    category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true },
    is_private: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'transactions',
    timestamps: false,
    underscored: true,
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
    Transaction.belongsTo(models.Family, { foreignKey: 'family_id', as: 'Family' });
    Transaction.belongsTo(models.Category, { foreignKey: 'category_id', as: 'Category' });
    Transaction.hasMany(models.GoalContribution, { foreignKey: 'transaction_id', as: 'GoalContributions' });
    Transaction.hasMany(models.WishContribution, { foreignKey: 'transaction_id', as: 'WishContributions' });
  };

  return Transaction;
};