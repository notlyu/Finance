const { sanitizeHtml, sanitizeComment } = require('../lib/validation');

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
      expect(result).toContain('script');
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
