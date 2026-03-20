const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Family = sequelize.define('Family', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    invite_code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    owner_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'families',
    timestamps: false,
    underscored: true,
  });

  Family.associate = (models) => {
    Family.belongsTo(models.User, { foreignKey: 'owner_user_id', as: 'Owner' });
    Family.hasMany(models.User, { foreignKey: 'family_id', as: 'Members' });
    Family.hasMany(models.Transaction, { foreignKey: 'family_id', as: 'Transactions' });
    Family.hasMany(models.Goal, { foreignKey: 'family_id', as: 'Goals' });
    Family.hasMany(models.Wish, { foreignKey: 'family_id', as: 'Wishes' });
    Family.hasMany(models.Category, { foreignKey: 'family_id', as: 'Categories' });
    Family.hasMany(models.FamilyInvite, { foreignKey: 'family_id', as: 'Invites' });
  };

  return Family;
};