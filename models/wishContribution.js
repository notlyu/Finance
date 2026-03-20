const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const WishContribution = sequelize.define('WishContribution', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    wish_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    transaction_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'wish_contributions',
    timestamps: false,
    underscored: true,
  });

  WishContribution.associate = (models) => {
    WishContribution.belongsTo(models.Wish, { foreignKey: 'wish_id', as: 'Wish' });
    WishContribution.belongsTo(models.Transaction, { foreignKey: 'transaction_id', as: 'Transaction' });
  };

  return WishContribution;
};