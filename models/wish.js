const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Wish = sequelize.define('Wish', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    family_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    priority: { type: DataTypes.SMALLINT.UNSIGNED, defaultValue: 3 },
    status: { type: DataTypes.ENUM('active', 'completed', 'postponed'), defaultValue: 'active' },
    saved_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
    // Archiving/completion state
    archived: { type: DataTypes.BOOLEAN, defaultValue: false },
    archived_at: { type: DataTypes.DATE, allowNull: true },
    // optional category (will be set in creation if not provided)
    category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_private: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'wishes',
    timestamps: false,
    underscored: true,
  });

  Wish.associate = (models) => {
    Wish.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
    Wish.belongsTo(models.Family, { foreignKey: 'family_id', as: 'Family' });
    Wish.hasMany(models.WishContribution, { foreignKey: 'wish_id', as: 'Contributions' });
    Wish.belongsTo(models.Category, { foreignKey: 'category_id', as: 'Category' });
  };

  return Wish;
};
