const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const FamilyInvite = sequelize.define('FamilyInvite', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    family_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'family_invites',
    timestamps: false,
    underscored: true,
  });

  FamilyInvite.associate = (models) => {
    FamilyInvite.belongsTo(models.Family, { foreignKey: 'family_id', as: 'Family' });
    FamilyInvite.belongsTo(models.User, { foreignKey: 'created_by', as: 'Creator' });
  };

  return FamilyInvite;
};