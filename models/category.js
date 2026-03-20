const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: { type: DataTypes.ENUM('income', 'expense'), allowNull: false },
    family_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'categories',
    timestamps: false,
    underscored: true,
  });

  Category.associate = (models) => {
    Category.belongsTo(models.Family, { foreignKey: 'family_id', as: 'Family' });
    Category.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
    Category.hasMany(models.Transaction, { foreignKey: 'category_id', as: 'Transactions' });
  };

  return Category;
};