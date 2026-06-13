const { z } = require('zod');
const { logger } = require('./errors');

function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;')
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

const passwordSchema = z
  .string()
  .min(8, 'Пароль должен содержать минимум 8 символов')
  .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
  .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
  .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру')
  .regex(/[^A-Za-z0-9]/, 'Пароль должен содержать хотя бы один спецсимвол (!@#$%^&*)');

const commonSchemas = {
  id: z.number().int().positive(),
  uuid: z.string().uuid(),
  email: z.string().email(),
  password: passwordSchema,
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
    rememberMe: z.boolean().optional(),
  }),
  changePassword: z.object({
    oldPassword: z.string(),
    newPassword: commonSchemas.password,
  }),
  forgotPassword: z.object({
    email: commonSchemas.email,
  }),
  createFamily: z.object({
    name: commonSchemas.name,
  }),
  joinFamily: z.object({
    inviteCode: z.string().length(10),
  }),
  transferOwnership: z.object({
    newOwnerId: z.coerce.number().int().positive(),
  }),
  updateProfile: z.object({
    name: commonSchemas.name.optional(),
    email: commonSchemas.email.optional(),
  }),
};

const transactionSchemas = {
  create: z.object({
    type: z.enum(['income', 'expense']),
    amount: z.coerce.number().positive(),
    category_id: z.coerce.number().int().positive(),
    account_id: z.coerce.number().int().positive().optional().nullable(),
    date: z.string().optional(),
    comment: z.string().max(500).optional().nullable(),
    scope: z.enum(['personal', 'family']).optional(),
  }),
  update: z.object({
    type: z.enum(['income', 'expense']).optional(),
    amount: z.coerce.number().positive().optional(),
    category_id: z.coerce.number().int().positive().optional(),
    account_id: z.coerce.number().int().positive().optional().nullable(),
    date: z.string().optional(),
    comment: z.string().max(500).optional().nullable(),
    scope: z.enum(['personal', 'family']).optional(),
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
    scope: z.enum(['personal', 'family']).optional(),
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
    scope: z.enum(['personal', 'family']).optional(),
    skipWarning: z.boolean().optional(),
  }),
};

const wishSchemas = {
  create: z.object({
    name: commonSchemas.name,
    cost: z.coerce.number().positive(),
    priority: z.coerce.number().min(1).max(5).optional(),
    saved_amount: z.coerce.number().min(0).optional(),
    scope: z.enum(['personal', 'family']).optional(),
    category_id: commonSchemas.id.optional(),
  }),
  update: z.object({
    name: commonSchemas.name.optional(),
    cost: z.coerce.number().positive().optional(),
    priority: z.coerce.number().min(1).max(5).optional(),
    saved_amount: z.coerce.number().min(0).optional(),
    scope: z.enum(['personal', 'family']).optional(),
    category_id: commonSchemas.id.optional().nullable(),
    status: z.enum(['active', 'funded', 'cancelled']).optional(),
    archived: z.boolean().optional(),
  }),
  contribute: z.object({
    amount: z.coerce.number().positive(),
    date: z.string().optional(),
    createTransaction: z.boolean().optional(),
    category_id: commonSchemas.id.optional(),
    comment: z.string().optional(),
    scope: z.enum(['personal', 'family']).optional(),
    skipWarning: z.boolean().optional(),
    account_id: commonSchemas.id.optional(),
  }),
  fund: z.object({
    amount: z.coerce.number().positive(),
    account_id: commonSchemas.id.optional(),
    skipWarning: z.boolean().optional(),
  }),
};

const budgetSchemas = {
  create: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    category_id: commonSchemas.id,
    limit_amount: z.number().positive(),
    scope: z.enum(['personal', 'family']).optional(),
  }),
  update: z.object({
    limit_amount: z.number().positive().optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    category_id: commonSchemas.id.optional(),
    type: z.enum(['income', 'expense']).optional(),
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
    scope: z.enum(['personal', 'family']).optional(),
  }),
  update: z.object({
    type: z.enum(['income', 'expense']).optional(),
    amount: z.number().positive().optional(),
    category_id: commonSchemas.id.optional(),
    day_of_month: z.number().int().min(1).max(28).optional(),
    comment: z.string().max(500).optional().nullable(),
    scope: z.enum(['personal', 'family']).optional(),
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

const knownWidgets = [
  'allocation', 'transactions', 'goals', 'memberStats', 'budgets',
  'recurring', 'debts', 'safetyPillow', 'analytics', 'family',
  'family-allocation', 'family-transactions', 'family-goals',
  // legacy types
  'balance', 'income-expense', 'recent-transactions',
  'family-balance', 'family-income-expense', 'family-goals',
];
const widgetListSchema = z.object({
  widgets: z.array(z.enum(knownWidgets)).min(0).max(50),
}).strict();

const widgetSchemas = {
  update: z.object({
    personal_widgets: widgetListSchema.optional(),
    family_widgets: widgetListSchema.optional(),
  }),
};

const accountSchemas = {
  create: z.object({
    name: commonSchemas.name,
    type: z.string().optional(),
    balance: z.coerce.number().optional(),
    currency: z.string().optional(),
    scope: z.enum(['personal', 'family']).optional(),
    is_liquid: z.boolean().optional(),
  }),
  update: z.object({
    name: commonSchemas.name.optional(),
    type: z.string().optional(),
    balance: z.coerce.number().optional(),
    currency: z.string().optional(),
    scope: z.enum(['personal', 'family']).optional(),
    is_active: z.boolean().optional(),
    is_liquid: z.boolean().optional(),
  }),
};

const debtSchemas = {
  create: z.object({
    name: commonSchemas.name,
    total_amount: z.coerce.number().positive(),
    start_date: z.string(),
    remaining: z.coerce.number().positive().optional(),
    interest_rate: z.coerce.number().min(0).optional(),
    monthly_payment: z.coerce.number().positive().optional(),
    type: z.string().optional(),
    end_date: z.string().optional(),
    notes: z.string().optional(),
    scope: z.enum(['personal', 'family']).optional(),
    create_recurring: z.boolean().optional(),
    category_id: z.coerce.number().int().positive().optional(),
    day_of_month: z.coerce.number().int().min(1).max(31).optional(),
  }),
  update: z.object({
    remaining: z.coerce.number().positive().optional(),
    monthly_payment: z.coerce.number().positive().optional(),
    is_active: z.boolean().optional(),
    notes: z.string().optional(),
  }),
  closePartial: z.object({
    amount: z.coerce.number().positive(),
  }),
};

const familySettingsSchemas = {
  update: z.object({
    show_personal_in_stats: z.boolean().optional(),
    safety_pillow_months: z.coerce.number().int().min(1).max(24).optional(),
  }),
};

const safetyPillowSchemas = {
  updateSettings: z.object({
    months: z.coerce.number().int().min(1).max(24),
  }),
};

// ─── Query-параметры (GET-эндпоинты) ───────────────────────────────────────

const querySchemas = {
  pagination: z.object({
    page:   commonSchemas.page,
    limit:  commonSchemas.limit,
    offset: z.coerce.number().int().min(0).default(0),
  }),

  transactions: z.object({
    page:       commonSchemas.page,
    limit:      z.coerce.number().int().min(1).max(200).default(50),
    offset:     z.coerce.number().int().min(0).default(0),
    type:       z.enum(['income', 'expense']).optional(),
    startDate:  z.string().optional(),
    endDate:    z.string().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    categoryIds: z.string().optional(),
    accountId:  z.coerce.number().int().positive().optional(),
    minAmount:  z.coerce.number().min(0).optional(),
    maxAmount:  z.coerce.number().min(0).optional(),
    memberId:   z.coerce.number().int().positive().optional(),
    q:          z.string().max(200).optional(),
    scope:      z.enum(['personal', 'family']).optional(),
    includePrivate: z.string().optional(),
    paginate:   z.enum(['true', 'false']).optional(),
  }),

  goals: z.object({
    page:       commonSchemas.page,
    limit:      z.coerce.number().int().min(1).max(200).default(50),
    offset:     z.coerce.number().int().min(0).default(0),
    scope:      z.enum(['personal', 'family']).optional(),
    archived:   z.enum(['true', 'false']).optional(),
  }),

  budgets: z.object({
    page:     commonSchemas.page,
    limit:    commonSchemas.limit,
    offset:   z.coerce.number().int().min(0).default(0),
    month:    z.string().regex(/^\d{4}-\d{2}$/).optional(),
    scope:    z.enum(['personal', 'family']).optional(),
    type:     z.enum(['income', 'expense']).optional(),
    period:   z.enum(['month', 'year']).optional(),
    year:     z.string().regex(/^\d{4}$/).optional(),
    memberId: z.coerce.number().int().positive().optional(),
  }),

  recurring: z.object({
    page:   commonSchemas.page,
    limit:  z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    scope:  z.enum(['personal', 'family']).optional(),
    type:   z.enum(['income', 'expense']).optional(),
    active: z.enum(['true', 'false']).optional(),
  }),

  debts: z.object({
    page:      commonSchemas.page,
    limit:     z.coerce.number().int().min(1).max(200).default(50),
    offset:    z.coerce.number().int().min(0).default(0),
    scope:     z.enum(['personal', 'family']).optional(),
    is_active: z.enum(['true', 'false']).optional(),
  }),

  accounts: z.object({
    page:      commonSchemas.page,
    limit:     commonSchemas.limit,
    offset:    z.coerce.number().int().min(0).default(0),
    scope:     z.enum(['personal', 'family']).optional(),
    is_active: z.enum(['true', 'false']).optional(),
  }),

  categories: z.object({
    page:      commonSchemas.page,
    limit:     commonSchemas.limit,
    offset:    z.coerce.number().int().min(0).default(0),
    type:      z.enum(['income', 'expense']).optional(),
    scope:     z.enum(['personal', 'family']).optional(),
  }),

  wishes: z.object({
    page:        commonSchemas.page,
    limit:       z.coerce.number().int().min(1).max(200).default(50),
    offset:      z.coerce.number().int().min(0).default(0),
    scope:       z.enum(['personal', 'family']).optional(),
    showArchived: z.enum(['true', 'false']).optional(),
  }),
};

/**
 * Middleware для валидации query-параметров через Zod.
 * Применяет схему к req.query, пишет результат в req.validatedQuery.
 * При ошибке возвращает 400 в стандартном формате.
 */
function validateQuery(schemaName) {
  return (req, res, next) => {
    const schema = querySchemas[schemaName];
    if (!schema) return next();
    const result = validate(schema, req.query);
    if (!result.success) {
      const firstError = result.error.split(', ')[0];
      return res.status(400).json({ side: 'backend', error: 'VALIDATION_ERROR', message: firstError });
    }
    req.validatedQuery = result.data;
    next();
  };
}

const schemas = {
  auth: authSchemas,
  transaction: transactionSchemas,
  category: categorySchemas,
  goal: goalSchemas,
  wish: wishSchemas,
  budget: budgetSchemas,
  recurring: recurringSchemas,
  notification: notificationSchemas,
  widget: widgetSchemas,
  account: accountSchemas,
  debt: debtSchemas,
  familySettings: familySettingsSchemas,
  safetyPillow: safetyPillowSchemas,
};

function validate(schema, data) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.errors?.map(e => `${e.path.join('.')}: ${e.message}`) || ['Validation error'];
      logger.warn({ errors: err.errors, data }, 'Validation failed');
      return { success: false, error: messages.join(', ') };
    }
    logger.warn({ err }, 'Validation error');
    return { success: false, error: err.message };
  }
}

function validateMiddleware(schemaName, schemaKey) {
  return (req, res, next) => {
    const schema = schemas[schemaName]?.[schemaKey];
    if (!schema) {
      return next();
    }
    if (!req.body) {
      req.body = {};
    }
    const result = validate(schema, req.body);
    if (!result.success) {
      const firstError = result.error.split(', ')[0];
      return res.status(400).json({ side: 'backend', error: 'VALIDATION_ERROR', message: firstError });
    }
    req.validated = result.data;
    next();
  };
}

function validateObjectId(req, res, next) {
  const id = req.params.id;
  if (!id || isNaN(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({ side: 'backend', error: 'VALIDATION_ERROR', message: 'Неверный ID параметр' });
  }
  req.params.id = Number(id);
  next();
}

function validateMemberId(req, res, next) {
  const memberId = req.params.memberId;
  if (!memberId || isNaN(Number(memberId)) || Number(memberId) <= 0) {
    return res.status(400).json({ side: 'backend', error: 'VALIDATION_ERROR', message: 'Неверный ID участника' });
  }
  req.params.memberId = Number(memberId);
  next();
}

module.exports = { schemas, validate, validateMiddleware, validateQuery, querySchemas, commonSchemas, validateObjectId, validateMemberId, sanitizeHtml, sanitizeComment };