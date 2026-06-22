const express = require('express');
const authMiddleware = require('../middleware/auth');
const auditService = require('../services/auditService');

const router = express.Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { entityType, entityId, action, limit, offset } = req.query;
    const result = await auditService.getAuditLogs(req.user.id, {
      entityType,
      entityId: entityId ? Number(entityId) : undefined,
      action,
      limit: Math.min(Number(limit) || 100, 500),
      offset: Number(offset) || 0,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
