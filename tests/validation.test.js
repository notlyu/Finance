const { sanitizeHtml, sanitizeComment, schemas, validate, validateObjectId } = require('../lib/validation');

describe('XSS Sanitization', () => {
  describe('sanitizeHtml', () => {
    test('должен экранировать HTML теги', () => {
      const result = sanitizeHtml('<script>alert(1)</script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('alert(1)');
      expect(result).not.toContain('<script>');
    });
    test('должен экранировать двойные кавычки', () => {
      expect(sanitizeHtml('"test"')).toBe('&quot;test&quot;');
    });
    test('должен экранировать одинарные кавычки', () => {
      expect(sanitizeHtml("'test'")).toBe('&#x27;test&#x27;');
    });
    test('должен экранировать слэши', () => {
      const result = sanitizeHtml('</script>');
      expect(result).toContain('&lt;');
      expect(result).not.toContain('</script>');
    });
    test('должен возвращать исходное значение для нестроковых', () => {
      expect(sanitizeHtml(123)).toBe(123);
      expect(sanitizeHtml(null)).toBe(null);
      expect(sanitizeHtml(undefined)).toBe(undefined);
    });
    test('должен обрабатывать пустую строку', () => {
      expect(sanitizeHtml('')).toBe('');
    });
  });
  describe('sanitizeComment', () => {
    test('должен санитизировать поле comment', () => {
      const input = { comment: '<script>alert(1)</script>', amount: 100 };
      const result = sanitizeComment(input);
      expect(result.comment).toContain('&lt;script&gt;');
      expect(result.comment).not.toContain('<script>');
      expect(result.amount).toBe(100);
    });
    test('должен санитизировать поле name', () => {
      const input = { name: '<b>Bold</b>', cost: 500 };
      const result = sanitizeComment(input, ['name']);
      expect(result.name).toContain('&lt;b&gt;');
      expect(result.name).not.toContain('<b>');
      expect(result.cost).toBe(500);
    });
    test('должен обрезать длинные комментарии до 500 символов', () => {
      const longComment = 'a'.repeat(600);
      const input = { comment: longComment };
      const result = sanitizeComment(input);
      expect(result.comment.length).toBe(500);
    });
    test('не должен изменять нестроковые поля', () => {
      const input = { comment: 'test', amount: 100, is_private: true };
      const result = sanitizeComment(input);
      expect(result.comment).toBe('test');
      expect(result.amount).toBe(100);
      expect(result.is_private).toBe(true);
    });
    test('должен пропускать undefined поля', () => {
      const input = { comment: 'test', name: undefined };
      const result = sanitizeComment(input, ['comment', 'name']);
      expect(result.comment).toBe('test');
      expect(result.name).toBeUndefined();
    });
  });
});

describe('Zod Schemas', () => {
  test('authSchemas.login валидирует email и password', () => {
    const r = validate(schemas.auth.login, { email: 'test@test.com', password: '123456' });
    expect(r.success).toBe(true);
  });
  test('authSchemas.login отклоняет неверный email', () => {
    const r = validate(schemas.auth.login, { email: 'bad', password: '123456' });
    expect(r.success).toBe(false);
  });
  test('authSchemas.login принимает любой пароль', () => {
    const r = validate(schemas.auth.login, { email: 'test@test.com', password: '12' });
    expect(r.success).toBe(true);
  });
  test('authSchemas.register требует name', () => {
    const r = validate(schemas.auth.register, { email: 'test@test.com', password: 'Test1234!$' });
    expect(r.success).toBe(false);
  });
  test('authSchemas.register валидирует с name', () => {
    const r = validate(schemas.auth.register, { email: 'test@test.com', password: 'Test1234!$', name: 'Test' });
    expect(r.success).toBe(true);
  });
  test('transactionSchemas.create валидирует обязательные поля', () => {
    const r = validate(schemas.transaction.create, { type: 'expense', amount: 1000, category_id: 1, date: '2026-05-01' });
    expect(r.success).toBe(true);
  });
  test('transactionSchemas.create отклоняет отрицательную сумму', () => {
    const r = validate(schemas.transaction.create, { type: 'expense', amount: -100, category_id: 1, date: '2026-05-01' });
    expect(r.success).toBe(false);
  });
  test('transactionSchemas.create отклоняет неверный тип', () => {
    const r = validate(schemas.transaction.create, { type: 'invalid', amount: 1000, category_id: 1, date: '2026-05-01' });
    expect(r.success).toBe(false);
  });
  test('goalSchemas.create валидирует', () => {
    const r = validate(schemas.goal.create, { name: 'Goal', target_amount: 10000 });
    expect(r.success).toBe(true);
  });
  test('goalSchemas.create отклоняет target_amount = 0', () => {
    const r = validate(schemas.goal.create, { name: 'Goal', target_amount: 0 });
    expect(r.success).toBe(false);
  });
  test('goalSchemas.contribute валидирует', () => {
    const r = validate(schemas.goal.contribute, { amount: 5000 });
    expect(r.success).toBe(true);
  });
  test('goalSchemas.contribute отклоняет отрицательную сумму', () => {
    const r = validate(schemas.goal.contribute, { amount: -100 });
    expect(r.success).toBe(false);
  });
  test('wishSchemas.create валидирует', () => {
    const r = validate(schemas.wish.create, { name: 'Wish', cost: 5000 });
    expect(r.success).toBe(true);
  });
  test('wishSchemas.create отклоняет cost = 0', () => {
    const r = validate(schemas.wish.create, { name: 'Wish', cost: 0 });
    expect(r.success).toBe(false);
  });
  test('wishSchemas.fund валидирует', () => {
    const r = validate(schemas.wish.fund, { amount: 3000 });
    expect(r.success).toBe(true);
  });
  test('wishSchemas.fund принимает с account_id', () => {
    const r = validate(schemas.wish.fund, { amount: 3000, account_id: 1 });
    expect(r.success).toBe(true);
  });
  test('budgetSchemas.create валидирует', () => {
    const r = validate(schemas.budget.create, { month: '2026-05', category_id: 1, limit_amount: 10000 });
    expect(r.success).toBe(true);
  });
  test('budgetSchemas.create отклоняет отрицательный limit', () => {
    const r = validate(schemas.budget.create, { month: '2026-05', category_id: 1, limit_amount: -100 });
    expect(r.success).toBe(false);
  });
  test('accountSchemas.create валидирует', () => {
    const r = validate(schemas.account.create, { name: 'Account' });
    expect(r.success).toBe(true);
  });
  test('accountSchemas.create any type passes', () => {
    const r = validate(schemas.account.create, { name: 'Bad', type: 'invalid' });
    expect(r.success).toBe(true);
  });
  test('debtSchemas.create валидирует', () => {
    const r = validate(schemas.debt.create, { name: 'Debt', total_amount: 10000, remaining: 10000, start_date: '2026-05-01', type: 'borrow' });
    expect(r.success).toBe(true);
  });
  test('debtSchemas.create any type passes', () => {
    const r = validate(schemas.debt.create, { name: 'Bad', total_amount: 1000, remaining: 1000, start_date: '2026-05-01', type: 'invalid' });
    expect(r.success).toBe(true);
  });
  test('recurringSchemas.create валидирует', () => {
    const r = validate(schemas.recurring.create, { type: 'expense', amount: 5000, category_id: 1, day_of_month: 15, start_month: '2026-05' });
    expect(r.success).toBe(true);
  });
  test('recurringSchemas.create отклоняет day_of_month = 32', () => {
    const r = validate(schemas.recurring.create, { type: 'expense', amount: 1000, category_id: 1, day_of_month: 32, start_month: '2026-05' });
    expect(r.success).toBe(false);
  });
  test('recurringSchemas.create отклоняет day_of_month = 0', () => {
    const r = validate(schemas.recurring.create, { type: 'expense', amount: 1000, category_id: 1, day_of_month: 0, start_month: '2026-05' });
    expect(r.success).toBe(false);
  });
  test('safetyPillowSchemas.updateSettings валидирует months', () => {
    const r = validate(schemas.safetyPillow.updateSettings, { months: 6 });
    expect(r.success).toBe(true);
  });
  test('safetyPillowSchemas.updateSettings отклоняет months = 0', () => {
    const r = validate(schemas.safetyPillow.updateSettings, { months: 0 });
    expect(r.success).toBe(false);
  });
  test('widgetSchemas.update валидирует widgets массив', () => {
    const r = validate(schemas.widget.update, { personal_widgets: { widgets: ['balance', 'goals'] } });
    expect(r.success).toBe(true);
  });
  test('widgetSchemas.update отклоняет невалидный тип виджета', () => {
    const r = validate(schemas.widget.update, { personal_widgets: { widgets: ['invalid'] } });
    expect(r.success).toBe(false);
  });
  test('widgetSchemas.update отклоняет не-объект', () => {
    const r = validate(schemas.widget.update, { personal_widgets: 'bad' });
    expect(r.success).toBe(false);
  });
});
describe('validateObjectId', () => {
  function mockReqRes(id) {
    const req = { params: { id } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();
    validateObjectId(req, res, next);
    return { req, res, next };
  }
  test('accepts valid numeric id', () => {
    const { req, next } = mockReqRes('5');
    expect(next).toHaveBeenCalled();
    expect(req.params.id).toBe(5);
  });
  test('rejects non-numeric id', () => {
    const { res, next } = mockReqRes('abc');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
  test('rejects negative id', () => {
    const { res, next } = mockReqRes('-1');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
  test('rejects zero id', () => {
    const { res, next } = mockReqRes('0');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
