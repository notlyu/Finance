const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const RecurringTransaction = sequelize.define('RecurringTransaction', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    family_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    type: { type: DataTypes.ENUM('income', 'expense'), allowNull: false },
    day_of_month: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 }, // 1..28 (safe)
    start_month: { type: DataTypes.STRING(7), allowNull: false }, // YYYY-MM
    comment: { type: DataTypes.TEXT, allowNull: true },
    is_private: { type: DataTypes.BOOLEAN, defaultValue: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    last_run_month: { type: DataTypes.STRING(7), allowNull: true }, // YYYY-MM
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'recurring_transactions',
    timestamps: false,
    underscored: true,
  });

  RecurringTransaction.associate = (models) => {
    RecurringTransaction.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
    RecurringTransaction.belongsTo(models.Family, { foreignKey: 'family_id', as: 'Family' });
    RecurringTransaction.belongsTo(models.Category, { foreignKey: 'category_id', as: 'Category' });
  };

  return RecurringTransaction;
};

