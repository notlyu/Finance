const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { cleanupUser } = require('./helpers');

// Grace-период ротации refresh-токена: параллельные вкладки с одним токеном
// не разлогиниваются; после окна старый токен отклоняется.

describe('Refresh token grace-period rotation', () => {
  const email = `grace_${Date.now()}@test.com`;
  let userId, originalRefresh;

  beforeAll(async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Password123!', name: 'Grace User' });
    userId = reg.body.id;
    originalRefresh = reg.body.refreshToken;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { user_id: userId } }).catch(() => {});
    await cleanupUser(userId);
  });

  test('first refresh succeeds', async () => {
    const res = await request(app).post('/api/auth/refresh-token').send({ refreshToken: originalRefresh });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  test('second refresh with the SAME token within grace also succeeds (no logout)', async () => {
    const res = await request(app).post('/api/auth/refresh-token').send({ refreshToken: originalRefresh });
    expect(res.status).toBe(200);
  });

  test('reuse after the grace window is rejected', async () => {
    // эмулируем истёкшее окно: rotated_at в прошлом за пределами grace
    await prisma.refreshToken.updateMany({
      where: { token: originalRefresh },
      data: { rotated_at: new Date(Date.now() - 5 * 60 * 1000) },
    });
    const res = await request(app).post('/api/auth/refresh-token').send({ refreshToken: originalRefresh });
    expect(res.status).toBe(401);
  });
});
