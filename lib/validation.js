const { z } = require('zod');

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
    amount: z.number().positive(),
    category_id: commonSchemas.id,
    date: z.string().optional(),
    comment: z.string().max(500).optional(),
    is_private: z.boolean().optional(),
  }),
  update: z.object({
    type: z.enum(['income', 'expense']).optional(),
    amount: z.number().positive().optional(),
    category_id: commonSchemas.id.optional(),
    date: z.string().optional(),
    comment: z.string().max(500).optional(),
    is_private: z.boolean().optional(),
  }),
};

const categorySchemas = {
  create: z.object({
    name: commonSchemas.name,
    type: z.enum(['income', 'expense']),
  }),
};

const goalSchemas = {
  create: z.object({
    name: commonSchemas.name,
    target_amount: z.number().positive(),
    target_date: z.string().datetime().optional(),
    current_amount: z.number().min(0).optional(),
    interest_rate: z.number().min(0).max(100).optional(),
    auto_contribute_enabled: z.boolean().optional(),
    auto_contribute_type: z.enum(['percentage', 'fixed']).optional(),
    auto_contribute_value: z.number().optional(),
    is_family_goal: z.boolean().optional(),
  }),
  contribute: z.object({
    amount: z.number().positive(),
    date: z.string().datetime().optional(),
    createTransaction: z.boolean().optional(),
    category_id: commonSchemas.id.optional(),
    comment: z.string().optional(),
    is_private: z.boolean().optional(),
    skipWarning: z.boolean().optional(),
  }),
};

const wishSchemas = {
  create: z.object({
    name: commonSchemas.name,
    cost: z.number().positive(),
    priority: z.number().min(1).max(5).optional(),
    saved_amount: z.number().min(0).optional(),
    is_private: z.boolean().optional(),
    category_id: commonSchemas.id.optional(),
  }),
};

const budgetSchemas = {
  create: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    type: z.enum(['income', 'expense']),
    category_id: commonSchemas.id,
    limit_amount: z.number().positive(),
    is_personal: z.boolean().optional(),
  }),
};

const recurringSchemas = {
  create: z.object({
    type: z.enum(['income', 'expense']),
    amount: z.number().positive(),
    category_id: commonSchemas.id,
    day_of_month: z.number().int().min(1).max(28),
    start_month: z.string().regex(/^\d{4}-\d{2}$/),
    comment: z.string().max(500).optional(),
    is_private: z.boolean().optional(),
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
};

function validate(schema, data) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: messages.join(', ') };
    }
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

module.exports = { schemas, validate, validateMiddleware, commonSchemas };