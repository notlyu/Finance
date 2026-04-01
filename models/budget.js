const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Budget = sequelize.define('Budget', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    family_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    month: { type: DataTypes.STRING(7), allowNull: false }, // YYYY-MM
    type: { type: DataTypes.ENUM('income', 'expense'), allowNull: false, defaultValue: 'expense' },
    limit_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'budgets',
    timestamps: false,
    underscored: true,
  });

  Budget.associate = (models) => {
    Budget.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
    Budget.belongsTo(models.Family, { foreignKey: 'family_id', as: 'Family' });
    Budget.belongsTo(models.Category, { foreignKey: 'category_id', as: 'Category' });
  };

  return Budget;
};

