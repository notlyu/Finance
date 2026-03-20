const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    family_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'users',
    timestamps: false,
    underscored: true,
  });

  User.associate = (models) => {
    User.belongsTo(models.Family, { foreignKey: 'family_id', as: 'Family' });
    User.hasMany(models.Transaction, { foreignKey: 'user_id', as: 'Transactions' });
    User.hasMany(models.Goal, { foreignKey: 'user_id', as: 'Goals' });
    User.hasMany(models.Wish, { foreignKey: 'user_id', as: 'Wishes' });
    User.hasOne(models.SafetyPillowSetting, { foreignKey: 'user_id', as: 'SafetyPillowSetting' });
    User.hasMany(models.SafetyPillowHistory, { foreignKey: 'user_id', as: 'SafetyPillowHistory' });
    User.hasMany(models.FamilyInvite, { foreignKey: 'created_by', as: 'Invites' });
  };

  return User;
};