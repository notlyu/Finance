const { z } = require('zod');

function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeComment(obj, fields = ['comment', 'name']) {
  const sanitized = { ...obj };
  for (const field of fields) {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeHtml(sanitized[field]).slice(0, 500);
    }
  }
  return sanitized;
}

const commonSchemas = {
  id: z.number().int().positive(),
  uuid: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const authSchemas = {
  register: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    name: commonSchemas.name,
  }),
  login: z.object({
    email: commonSchemas.email,
    password: z.string(),
  }),
  changePassword: z.object({
    oldPassword: z.string(),
    newPassword: commonSchemas.password,
  }),
  createFamily: z.object({
    name: commonSchemas.name,
  }),
  joinFamily: z.object({
    inviteCode: z.string().length(10),
  }),
};

const transactionSchemas = {
  create: z.object({
    type: z.enum(['income', 'expense']),
    amount: z.coerce.number().positive(),
    category_id: z.coerce.number().int().positive(),
    date: z.string().optional(),
    comment: z.string().max(500).optional().nullable(),
    scope: z.enum(['personal', 'family', 'shared']).optional(),
  }),
  update: z.object({
    type: z.enum(['income', 'expense']).optional(),
    amount: z.coerce.number().positive().optional(),
    category_id: z.coerce.number().int().positive().optional(),
    date: z.string().optional(),
    comment: z.string().max(500).optional().nullable(),
    scope: z.enum(['personal', 'family', 'shared']).optional(),
  }),
};

const categorySchemas = {
  create: z.object({
    name: commonSchemas.name,
    type: z.enum(['income', 'expense']),
  }),
  update: z.object({
    name: commonSchemas.name.optional(),
  }),
};

const goalSchemas = {
  create: z.object({
    name: commonSchemas.name,
    target_amount: z.coerce.number().positive(),
    target_date: z.string().optional(),
    current_amount: z.coerce.number().min(0).optional(),
    interest_rate: z.coerce.number().min(0).max(100).optional(),
    auto_contribute_enabled: z.boolean().optional(),
    auto_contribute_type: z.enum(['percentage', 'fixed']).optional(),
    auto_contribute_value: z.coerce.number().optional().nullable(),
    scope: z.enum(['personal', 'family', 'shared']).optional(),
  }).passthrough(),
  update: z.object({
    name: commonSchemas.name.optional(),
    target_amount: z.number().positive().optional(),
    target_date: z.string().datetime().optional().nullable(),
    current_amount: z.number().min(0).optional(),
    interest_rate: z.number().min(0).max(100).optional(),
    auto_contribute_enabled: z.boolean().optional(),
    auto_contribute_type: z.enum(['percentage', 'fixed']).optional().nullable(),
    auto_contribute_value: z.number().optional().nullable(),
    is_archived: z.boolean().optional(),
  }),
  contribute: z.object({
    amount: z.number().positive(),
    date: z.string().datetime().optional(),
    createTransaction: z.boolean().optional(),
    category_id: commonSchemas.id.optional(),
    comment: z.string().optional(),
    scope: z.enum(['personal', 'family', 'shared']).optional(),
    skipWarning: z.boolean().optional(),
  }),
};

const wishSchemas = {
  create: z.object({
    name: commonSchemas.name,
    cost: z.number().positive(),
    priority: z.number().min(1).max(5).optional(),
    saved_amount: z.number().min(0).optional(),
    scope: z.enum(['personal', 'family', 'shared']).optional(),
    category_id: commonSchemas.id.optional(),
  }),
  update: z.object({
    name: commonSchemas.name.optional(),
    cost: z.number().positive().optional(),
    priority: z.number().min(1).max(5).optional(),
    saved_amount: z.number().min(0).optional(),
    scope: z.enum(['personal', 'family', 'shared']).optional(),
    category_id: commonSchemas.id.optional().nullable(),
    status: z.enum(['active', 'funded', 'cancelled']).optional(),
    archived: z.boolean().optional(),
  }),
};

const budgetSchemas = {
  create: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    category_id: commonSchemas.id,
    limit_amount: z.number().positive(),
    scope: z.enum(['personal', 'family', 'shared']).optional(),
  }),
  update: z.object({
    limit_amount: z.number().positive().optional(),
  }),
};

const recurringSchemas = {
  create: z.object({
    type: z.enum(['income', 'expense']),
    amount: z.number().positive(),
    category_id: commonSchemas.id,
    day_of_month: z.number().int().min(1).max(31),
    start_month: z.string().regex(/^\d{4}-\d{2}$/),
    comment: z.string().max(500).optional(),
    scope: z.enum(['personal', 'family', 'shared']).optional(),
  }),
  update: z.object({
    type: z.enum(['income', 'expense']).optional(),
    amount: z.number().positive().optional(),
    category_id: commonSchemas.id.optional(),
    day_of_month: z.number().int().min(1).max(28).optional(),
    comment: z.string().max(500).optional().nullable(),
    scope: z.enum(['personal', 'family', 'shared']).optional(),
    active: z.boolean().optional(),
  }),
};

const notificationSchemas = {
  updateSettings: z.object({
    remind_upcoming: z.boolean().optional(),
    notify_goal_reached: z.boolean().optional(),
    notify_budget_exceeded: z.boolean().optional(),
    notify_wish_completed: z.boolean().optional(),
  }),
};

const schemas = {
  auth: authSchemas,
  transaction: transactionSchemas,
  category: categorySchemas,
  goal: goalSchemas,
  wish: wishSchemas,
  budget: budgetSchemas,
  recurring: recurringSchemas,
  notification: notificationSchemas,
};

function validate(schema, data) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.errors?.map(e => `${e.path.join('.')}: ${e.message}`) || ['Validation error'];
      console.log('Validation failed:', err.errors, 'Data:', data);
      return { success: false, error: messages.join(', ') };
    }
    console.log('Validation error:', err);
    return { success: false, error: err.message };
  }
}

function validateMiddleware(schemaName, schemaKey) {
  return (req, res, next) => {
    const schema = schemas[schemaName]?.[schemaKey];
    if (!schema) {
      return next();
    }
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }
    const result = validate(schema, req.body);
    if (!result.success) {
      const firstError = result.error.split(', ')[0];
      return res.status(400).json({ message: firstError });
    }
    req.validated = result.data;
    next();
  };
}

function validateObjectId(req, res, next) {
  const id = req.params.id;
  if (!id || isNaN(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({ message: 'Неверный ID параметр' });
  }
  req.params.id = Number(id);
  next();
}

function validateMemberId(req, res, next) {
  const memberId = req.params.memberId;
  if (!memberId || isNaN(Number(memberId)) || Number(memberId) <= 0) {
    return res.status(400).json({ message: 'Неверный ID участника' });
  }
  req.params.memberId = Number(memberId);
  next();
}

module.exports = { schemas, validate, validateMiddleware, commonSchemas, validateObjectId, validateMemberId, sanitizeHtml, sanitizeComment };