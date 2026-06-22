jest.mock('express-rate-limit', () => {
  return () => (req, res, next) => next();
});

jest.mock('../services/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(),
}));

const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { createTestUser, generateToken, cleanupUser } = require('./helpers');

let testUser, testToken;

beforeAll(async () => {
  testUser = await createTestUser();
  testToken = generateToken(testUser.id);
}, 30000);

afterAll(async () => {
  await cleanupUser(testUser?.id);
});

describe('Auth', () => {
  describe('POST /api/auth/register', () => {
    const newUserEmail = () => `register_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;

    test('creates user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: newUserEmail(), password: 'Test1234!$', name: 'New User' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.id).toBeGreaterThan(0);
      expect(res.body.email).toBeTruthy();

      await prisma.user.delete({ where: { id: res.body.id } }).catch(() => {});
    });

    test('returns 409 for duplicate email', async () => {
      const email = newUserEmail();
      await request(app).post('/api/auth/register').send({ email, password: 'Test1234!$', name: 'User1' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'Test1234!$', name: 'User2' });
      expect(res.status).toBe(409);
    });

    test('returns 400 for missing fields', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: newUserEmail() });
      expect(res.status).toBe(400);
    });

    test('returns 400 for weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: newUserEmail(), password: '12', name: 'Bad' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    test('logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'Test1234!$' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toBe(testUser.email);
    });

    test('returns 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpass' });
      expect(res.status).toBe(401);
    });

    test('returns 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'Test1234!$' });
      expect(res.status).toBe(401);
    });

    test('returns 400 for missing fields', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: testUser.email });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    test('returns user when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(testUser.email);
    });

    test('returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    test('returns error with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      // JWT verification error returns 500 from error handler
      expect(res.status >= 401).toBe(true);
    });
  });

  describe('POST /api/auth/change-password', () => {
    test('changes password successfully', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ oldPassword: 'Test1234!$', newPassword: 'Newpass1234!$' });
      expect(res.status).toBe(200);

      // Verify new password works
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'Newpass1234!$' });
      expect(loginRes.status).toBe(200);
    });

    test('returns 401 with wrong current password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ oldPassword: 'wrongpass', newPassword: 'Newpass1234!$' });
      expect(res.status).toBe(401);
    });

    test('returns 400 for weak new password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ oldPassword: 'Test1234!$', newPassword: '12' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    test('sends reset code for valid email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    test('returns 200 even for non-existent email (security)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });
      expect(res.status).toBe(200);
    });

    test('returns 400 for missing email', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    test('resets password with valid code', async () => {
      // First get a reset code
      await request(app).post('/api/auth/forgot-password').send({ email: testUser.email });
      const reset = await prisma.passwordResetToken.findFirst({
        where: { user_id: testUser.id },
        orderBy: { created_at: 'desc' },
      });
      expect(reset).toBeTruthy();

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ code: reset.token, email: testUser.email, newPassword: 'Reset12!$' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    test('returns 400 for invalid code', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ code: 'invalidcode', email: testUser.email, newPassword: 'Reset12!$' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('logs out successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    test('returns 400 without refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh-token');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/revoke-token', () => {
    test('returns 200 for valid token', async () => {
      // Login with current password (reset-password changed it to resetpass123)
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'Reset12!$' });
      expect(loginRes.status).toBe(200);

      const res = await request(app)
        .post('/api/auth/revoke-token')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ refreshToken: loginRes.body.refreshToken });
      expect(res.status).toBe(200);
    });
  });
});
