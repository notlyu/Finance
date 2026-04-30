const familyRoleService = require('../services/familyRoleService');

const requireRole = (...requiredRoles) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user?.family_id) {
        return res.status(403).json({ message: 'Вы не состоите в семье' });
      }

      const hasRole = await familyRoleService.hasPermission(user.id, user.family_id, requiredRoles);
      if (!hasRole) {
        return res.status(403).json({ message: 'У вас недостаточно прав для этого действия' });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

const requireAction = (action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user?.family_id) {
        return res.status(403).json({ message: 'Вы не состоите в семье' });
      }

      const canPerform = await familyRoleService.canPerform(user.id, user.family_id, action);
      if (!canPerform) {
        return res.status(403).json({ message: 'У вас нет доступа к этому действию' });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { requireRole, requireAction };