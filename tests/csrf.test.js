const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { cleanupUser } = require('./helpers');

// CSRF: cookie-аутентифицированные мутации требуют валидный X-CSRF-Token.
// Bearer-аутентифицированные (тесты/API) — освобождены.

describe('CSRF protection', () => {
  const email = `csrf_${Date.now()}@test.com`;
  let agent, userId, csrfToken;

  beforeAll(async () => {
    agent = request.agent(app); // persists cookies (token + XSRF-TOKEN)
    const reg = await agent
      .post('/api/auth/register')
      .send({ email, password: 'Password123!', name: 'CSRF User' });
    userId = reg.body.id;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { user_id: userId } }).catch(() => {});
    await cleanupUser(userId);
  });

  test('GET /api/auth/csrf-token returns a token and sets the cookie', async () => {
    const res = await agent.get('/api/auth/csrf-token');
    expect(res.status).toBe(200);
    expect(typeof res.body.csrfToken).toBe('string');
    expect(res.headers['set-cookie'].join(';')).toMatch(/XSRF-TOKEN=/);
    csrfToken = res.body.csrfToken;
  });

  test('cookie-auth mutation WITHOUT CSRF token → 403', async () => {
    const res = await agent
      .post('/api/categories')
      .send({ name: 'NoCSRF', type: 'expense' });
    expect(res.status).toBe(403);
  });

  test('cookie-auth mutation WITH valid CSRF token → succeeds', async () => {
    const res = await agent
      .post('/api/categories')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'WithCSRF', type: 'expense' });
    expect([200, 201]).toContain(res.status);
  });

  test('Bearer-auth mutation is exempt (no CSRF token needed)', async () => {
    // Bearer-путь обрабатывается остальными тестами; здесь проверяем, что отсутствие
    // CSRF-токена при Bearer не даёт 403 (а даёт 401 без валидного токена — не 403).
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ name: 'BearerNoCSRF', type: 'expense' });
    expect(res.status).not.toBe(403);
  });
});
